// Spielzeug-Look der Figuren (Wunsch „Figurenstil mehr wie Super Mario 3D World“): glatte, glänzende Vinyl-Oberflächen
// mit weichem Randlicht, einer kleinen Glanzkante und sanft angehobener Sättigung – ohne zusätzliche Zeichenaufrufe,
// ohne Nachbearbeitungs-Pass. applyToyLook() erweitert ein MeshStandardMaterial per onBeforeCompile um wenige Zeilen
// im Fragment-Shader (vor <opaque_fragment>, also vor Tonemapping und Nebel – das Randlicht verblasst im Dunst mit).
// Alle Spielzeug-Materialien teilen EIN onBeforeCompile und einen festen customProgramCacheKey: gleiche Material-
// Parameter → dasselbe Shader-Programm (nur ein zusätzliches Programm je Variante, die es mit und ohne Look gibt).
//
// Schnittstelle:
//   applyToyLook(material, { rim, spec, sat })   einmal je (geteiltem) Material; rim/spec/sat sind Faktoren je
//                                                Materialart (Standard nach Rauheit/Metall, siehe toyDefaults)
//                                                → material (unverändert, wenn kein MeshStandardMaterial / ?toy=0)
//   setToyLookEnv({ rimColor, rimStrength, rimShape, specStrength, keyColor, keyDir, saturation, fill })
//                                                globale Werte (je Thema/Stimmung aus CourseView bzw. Karte); keyDir
//                                                im Kameraraum (Richtung zum Glanzlicht)
//   getToyLookEnv() → Kopie der Werte · isToyOnly(material) → nur dieser Look gepatcht (Instanz-Spiegel erlaubt)
//   plainTwin(material) / plainTree(root)        schlichter Zwilling ohne Look (Kulisse mit geteilten Materialien)
//   toyStats() → { materials } · TOY_ENABLED (false bei ?toy=0: Vergleich vorher/nachher, Licht wie früher)
//
// Kosten: ~35 ALU-Befehle (eine exp2, eine Wurzel) je Pixel nur auf Spielzeug-Materialien, keine Textur, keine neue
// Lichtquelle; stehen alle Stärken auf 0, überspringt der Shader den Block.

import * as THREE from 'three';

let enabled = true;
try { enabled = new URLSearchParams(globalThis.location?.search ?? '').get('toy') !== '0'; } catch { /* kein window */ }
/** false bei ?toy=0 (Vergleichsschalter: Materialien und Licht wie vor dem Spielzeug-Look). */
export const TOY_ENABLED = enabled;

// Geteilte Uniform-Objekte: jedes Spielzeug-Material hängt dieselben Objekte ein, setToyLookEnv ändert nur .value.
const U = {
  toyRimColor: { value: new THREE.Color(0.86, 0.94, 1.0) },
  toyKeyColor: { value: new THREE.Color(1.0, 0.97, 0.9) },
  toyKeyDir: { value: new THREE.Vector3(-0.32, 0.62, 0.72).normalize() },
  // x Randlicht, y Glanzkante, z Sättigung, w Form des Randlichts (0 → x², 1 → x³)
  toyEnv: { value: new THREE.Vector4(0.8, 0.7, 0.14, 0.35) },
  toyFill: { value: 0.06 },
};

const ENV = {
  rimColor: U.toyRimColor.value, keyColor: U.toyKeyColor.value, keyDir: U.toyKeyDir.value,
  get rimStrength() { return U.toyEnv.value.x; }, set rimStrength(v) { U.toyEnv.value.x = v; },
  get specStrength() { return U.toyEnv.value.y; }, set specStrength(v) { U.toyEnv.value.y = v; },
  get saturation() { return U.toyEnv.value.z; }, set saturation(v) { U.toyEnv.value.z = v; },
  get rimShape() { return U.toyEnv.value.w; }, set rimShape(v) { U.toyEnv.value.w = v; },
  get fill() { return U.toyFill.value; }, set fill(v) { U.toyFill.value = v; },
};

/** Globale Werte setzen (Teilangaben; Farben als Hex/Color, sRGB-Hex wird wie überall in linear umgerechnet). */
export function setToyLookEnv(o = {}) {
  if (o.rimColor !== undefined) ENV.rimColor.set(o.rimColor);
  if (o.keyColor !== undefined) ENV.keyColor.set(o.keyColor);
  if (o.keyDir !== undefined) { if (o.keyDir.isVector3) ENV.keyDir.copy(o.keyDir); else ENV.keyDir.set(...o.keyDir); ENV.keyDir.normalize(); }
  for (const k of ['rimStrength', 'specStrength', 'saturation', 'rimShape', 'fill']) if (typeof o[k] === 'number') ENV[k] = o[k];
}

/** Kopie der globalen Werte (Tests, Anzeige). */
export function getToyLookEnv() {
  return {
    rimColor: ENV.rimColor.getHex(), keyColor: ENV.keyColor.getHex(), keyDir: ENV.keyDir.toArray().map((v) => +v.toFixed(3)),
    rimStrength: +ENV.rimStrength.toFixed(3), specStrength: +ENV.specStrength.toFixed(3), saturation: +ENV.saturation.toFixed(3),
    rimShape: ENV.rimShape, fill: +ENV.fill.toFixed(3),
  };
}

// ------------------------------------------------------------------ Shader
const PARS = /* glsl */`
uniform vec3 toyRimColor;
uniform vec3 toyKeyColor;
uniform vec3 toyKeyDir;
uniform vec4 toyEnv;
uniform float toyFill;
uniform vec3 toyMat;
`;

// Nach der Beleuchtung (outgoingLight), vor <opaque_fragment>: normal (Kameraraum, normiert), diffuseColor,
// roughnessFactor. Sind Randlicht, Glanz und Sättigung global 0, überspringt der Shader alles (einheitlicher Zweig).
const BODY = /* glsl */`
if ( toyEnv.x + toyEnv.y + toyEnv.z + toyFill > 0.0 ) {
	vec3 toyV = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition );
	float toyX = 1.0 - saturate( dot( normal, toyV ) );
	vec3 toyAlb = diffuseColor.rgb;
	// weiches Randlicht (Fresnel x^2..x^3), oben stärker – viewMatrix[ 1 ] ist die Welt-Senkrechte im Kameraraum –,
	// in Himmelsfarbe mit einem Hauch Eigenfarbe (dunkle Figuren bekommen eine helle Kante, helle keine weiße Fläche)
	float toyFr = toyX * toyX * mix( 1.0, toyX, toyEnv.w ) * saturate( 0.6 + 0.4 * dot( normal, viewMatrix[ 1 ].xyz ) );
	vec3 toyTint = 0.6 + 0.4 * toyAlb / max( max( toyAlb.r, toyAlb.g ), max( toyAlb.b, 0.04 ) );
	outgoingLight += toyRimColor * toyTint * ( toyFr * toyEnv.x * toyMat.x );
	// sanfte Aufhellung der Kamera-Seite (Figuren wirken von vorn ausgeleuchtet)
	outgoingLight += toyAlb * toyRimColor * ( toyFill * toyMat.x * ( 1.0 - toyX ) );
	// Glanzkante: weiches, helles Spielzeug-Glanzlicht (Richtung im Kameraraum); auch raue Teile glänzen etwas (Vinyl),
	// glatte schärfer und heller
	float toyG = 1.0 - clamp( roughnessFactor, 0.05, 1.0 );
	float toyNH = saturate( dot( normal, normalize( toyKeyDir + toyV ) ) );
	float toyS = exp2( ( toyNH - 1.0 ) * ( 16.0 + 160.0 * toyG * toyG ) * 1.4427 ) * ( 0.3 + 0.7 * toyG );
	outgoingLight += toyKeyColor * ( toyS * toyEnv.y * toyMat.y );
	// sanft angehobene Sättigung (linear)
	float toyY = dot( outgoingLight, vec3( 0.2126, 0.7152, 0.0722 ) );
	outgoingLight = max( mix( vec3( toyY ), outgoingLight, 1.0 + toyEnv.z * toyMat.z ), 0.0 );
	// weiche Lichter-Schulter (farbtonerhaltend, ab 0,8): Glanz und Randlicht laufen weich aus statt hart ins Weiß
	float toyPk = max( max( outgoingLight.r, outgoingLight.g ), outgoingLight.b );
	if ( toyPk > 0.8 ) outgoingLight *= ( 0.8 + ( toyPk - 0.8 ) / ( 1.0 + ( toyPk - 0.8 ) * 4.0 ) ) / toyPk;
}
`;

const PATCHED = new WeakSet();
let count = 0;

/** Gemeinsames onBeforeCompile aller Spielzeug-Materialien (this = Material). */
function toyCompile(shader, renderer) {
  const prev = this.__toyPrev;
  if (prev) prev.call(this, shader, renderer);
  shader.uniforms.toyRimColor = U.toyRimColor;
  shader.uniforms.toyKeyColor = U.toyKeyColor;
  shader.uniforms.toyKeyDir = U.toyKeyDir;
  shader.uniforms.toyEnv = U.toyEnv;
  shader.uniforms.toyFill = U.toyFill;
  shader.uniforms.toyMat = this.__toy;
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${PARS}`)
    .replace('#include <opaque_fragment>', `${BODY}\n#include <opaque_fragment>`);
}
const TOY_KEY = 'toylook:1';
function toyKey() { return this.__toyPrevKey ? `${this.__toyPrevKey.call(this)}|${TOY_KEY}` : TOY_KEY; }

/** Faktoren je Materialart: Metall (eigene Spiegelung) zurückhaltend, raue Stoffe/Fell weiches Randlicht ohne Glanz. */
export function toyDefaults(m) {
  const r = m.roughness ?? 0.5, metal = m.metalness ?? 0;
  if (metal > 0.4) return { rim: 0.55, spec: 0.7, sat: 0.6 };
  if (r >= 0.75) return { rim: 0.85, spec: 0.3, sat: 1 };
  return { rim: 1, spec: 1, sat: 1 };
}

/**
 * Spielzeug-Look auf ein MeshStandardMaterial (auch MeshPhysicalMaterial) legen – einmal je Material (weitere Aufrufe
 * ändern nur die Faktoren). Klone (z. B. Aufblitzen bei Treffern) erben den Look.
 * @param {THREE.Material} material
 * @param {{ rim?: number, spec?: number, sat?: number }} [opts] Faktoren (Standard: toyDefaults)
 */
export function applyToyLook(material, opts = {}) {
  if (!TOY_ENABLED || !material?.isMeshStandardMaterial || material.userData?.toy === false) return material;
  const d = toyDefaults(material);
  const rim = opts.rim ?? d.rim, spec = opts.spec ?? d.spec, sat = opts.sat ?? d.sat;
  if (PATCHED.has(material)) {
    if (opts.rim !== undefined || opts.spec !== undefined || opts.sat !== undefined) material.__toy.value.set(rim, spec, sat);
    return material;
  }
  PATCHED.add(material);
  count++;
  const hidden = (k, v) => Object.defineProperty(material, k, { value: v, writable: true, configurable: true, enumerable: false });
  hidden('__toy', { value: new THREE.Vector3(rim, spec, sat) });
  // vorhandenes eigenes onBeforeCompile (z. B. Shader-Kniffe einzelner Modelle) bleibt erhalten und läuft zuerst
  if (Object.prototype.hasOwnProperty.call(material, 'onBeforeCompile')) {
    hidden('__toyPrev', material.onBeforeCompile);
    hidden('__toyPrevKey', Object.prototype.hasOwnProperty.call(material, 'customProgramCacheKey') ? material.customProgramCacheKey : null);
  }
  material.onBeforeCompile = toyCompile;
  material.customProgramCacheKey = toyKey;
  const opt = { rim, spec, sat };
  hidden('clone', function clone() { return applyToyLook(Object.getPrototypeOf(this).clone.call(this), opt); });
  material.needsUpdate = true;
  return material;
}

/** Nur der Spielzeug-Look gepatcht (kein weiteres eigenes onBeforeCompile) – z. B. für Instanz-Spiegel unbedenklich. */
export const isToyOnly = (m) => !!m && PATCHED.has(m) && m.onBeforeCompile === toyCompile && !m.__toyPrev;

/** Spielzeug-Look auf alle passenden Materialien eines Objekts (Kinder eingeschlossen). */
export function applyToyLookTree(root, opts) {
  root.traverse((o) => {
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) m.forEach((x) => applyToyLook(x, opts)); else applyToyLook(m, opts);
  });
  return root;
}

const TWINS = new WeakMap();
/**
 * Schlichter Zwilling eines Spielzeug-Materials (gleiche Werte, ohne Look; je Material einmal, geteilt) – für Kulisse,
 * die geteilte Materialien mit Figuren nutzt. Nicht gepatchte Materialien kommen unverändert zurück.
 */
export function plainTwin(m) {
  if (!m || !PATCHED.has(m)) return m;
  let t = TWINS.get(m);
  if (!t) {
    t = Object.getPrototypeOf(m).clone.call(m);   // Material.clone ohne den Spielzeug-Zusatz
    t.name = `${m.name}:schlicht`;
    t.userData.toy = false;
    TWINS.set(m, t);
  }
  return t;
}

/** Alle Spielzeug-Materialien eines Objekts durch ihre schlichten Zwillinge ersetzen (Kulisse). */
export function plainTree(root) {
  root.traverse((o) => {
    const m = o.material;
    if (!m) return;
    if (Array.isArray(m)) o.material = m.map(plainTwin); else o.material = plainTwin(m);
  });
  return root;
}

/** Spielzeug-Look auf diesem Material? */
export const hasToyLook = (m) => !!m && PATCHED.has(m);

/** Anzahl der Spielzeug-Materialien (Tests). */
export const toyStats = () => ({ enabled: TOY_ENABLED, materials: count, env: getToyLookEnv() });
