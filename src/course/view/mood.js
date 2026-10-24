// Stimmungen der Kurs-Ansicht (Bausteine Welt 3): weiche Überblendung von Nebel, Hintergrund, Himmelslicht, Sonne und
// Himmelskuppel zwischen der Grundstimmung des Themas und benannten Stimmungen (theme.moods, z. B. ghost 'aussen'), dazu
// die Unterwasser-Stimmung (Farbton, naher Nebel, wandernde Lichtflecken und Lichtstrahlen als Bild-Überlagerung).
//
// Schnittstelle (über CourseView):
//   view.setMood(name | null, { time: 0.8 })   benannte Stimmung des Themas (null = Grundstimmung), überblendet in time s
//   view.setUnderwater(on)                     true/false erzwingt die Unterwasser-Stimmung, 'auto' (Standard) = selbst
//                                              erkennen, sofern das Thema `underwater` hat: Unterwasser-Ansicht des Motors
//                                              (player/underwater.js, scene.underwater.state.k ≥ 0,3: Kamera im Wasser
//                                              bzw. Figur getaucht) oder Figur schwimmt mit dem Kopf unter Wasser
//   view.underwater → bool, view.mood.info() → { mood, water (0..1), forced, auto, motorK }
// Arbeitsteilung mit player/underwater.js (läuft je Bild nach dieser Stimmung): der Motor färbt Nebel/Hintergrund und
// legt die Tönung vor die Kamera; hier kommen Himmelslicht, Sonne, Kuppel-Farbton, Figurenlicht und die Lichtflecken/
// -strahlen dazu. Erzwungen (setUnderwater(true)) setzt diese Stimmung auch Nebel/Hintergrund (Motor-Ansicht aus).
// Thema-Felder (alle optional, sonst Standardwerte unten):
//   moods: { name: { fog: { color, near, far }, background, hemi: { sky, ground, intensity }, sun: { color, intensity },
//                    dome (Farbton der Himmelskuppel), playerLight (Faktor) } }
//   underwater: { …wie ein Stimmungs-Eintrag…, caustics: 0.45 (Stärke der Lichtflecken), color (Lichtfarbe) }

import * as THREE from 'three';

const UW_DEFAULT = {
  fog: { color: 0x0e4c7a, near: 2, far: 40 },
  background: 0x0b3a64,
  hemi: { sky: 0x8ad8ff, ground: 0x0a3a5a, intensity: 1.15 },
  sun: { color: 0xc8ecff, intensity: 1.5 },
  dome: 0x1e5e90,
  playerLight: 0.8,
  caustics: 0.45,
  color: 0x9ff0ff,
};

const C = (v) => new THREE.Color(v);

/** Vollständige Stimmungs-Werte (Farben als THREE.Color) aus Teilangaben über einer Basis. */
function resolve(part, base) {
  const p = part ?? {};
  return {
    fogColor: p.fog?.color !== undefined ? C(p.fog.color) : base.fogColor.clone(),
    fogNear: p.fog?.near ?? base.fogNear,
    fogFar: p.fog?.far ?? base.fogFar,
    background: p.background !== undefined ? C(p.background) : base.background.clone(),
    hemiSky: p.hemi?.sky !== undefined ? C(p.hemi.sky) : base.hemiSky.clone(),
    hemiGround: p.hemi?.ground !== undefined ? C(p.hemi.ground) : base.hemiGround.clone(),
    hemiI: p.hemi?.intensity ?? base.hemiI,
    sunColor: p.sun?.color !== undefined ? C(p.sun.color) : base.sunColor.clone(),
    sunI: p.sun?.intensity ?? base.sunI,
    dome: p.dome !== undefined ? C(p.dome) : base.dome.clone(),
    playerLight: p.playerLight ?? base.playerLight,
  };
}

function lerpInto(out, a, b, k) {
  out.fogColor.copy(a.fogColor).lerp(b.fogColor, k);
  out.fogNear = a.fogNear + (b.fogNear - a.fogNear) * k;
  out.fogFar = a.fogFar + (b.fogFar - a.fogFar) * k;
  out.background.copy(a.background).lerp(b.background, k);
  out.hemiSky.copy(a.hemiSky).lerp(b.hemiSky, k);
  out.hemiGround.copy(a.hemiGround).lerp(b.hemiGround, k);
  out.hemiI = a.hemiI + (b.hemiI - a.hemiI) * k;
  out.sunColor.copy(a.sunColor).lerp(b.sunColor, k);
  out.sunI = a.sunI + (b.sunI - a.sunI) * k;
  out.dome.copy(a.dome).lerp(b.dome, k);
  out.playerLight = a.playerLight + (b.playerLight - a.playerLight) * k;
  return out;
}

const VERT = `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const FRAG = `
uniform float t; uniform float k; uniform float aspect; uniform vec3 col; varying vec2 vUv;
float caust(vec2 p) {
  vec2 q = p; float c = 0.0;
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    q += vec2(sin(q.y * 1.7 + t * 0.9 + fi), cos(q.x * 1.5 - t * 0.7 + fi * 1.3)) * 0.5;
    c += abs(sin(q.x * 2.1) + sin(q.y * 2.3));
  }
  float v = max(0.0, 1.0 - c * 0.45);
  return v * v * v;
}
void main() {
  vec2 p = vec2(vUv.x * aspect, vUv.y) * 5.0 + vec2(t * 0.05, 0.0);
  float c = caust(p) * (0.25 + 0.75 * smoothstep(0.05, 0.75, 1.0 - vUv.y));
  float sway = sin(vUv.x * 3.0 + t * 0.35) * 1.6;
  float rays = pow(max(0.0, sin(vUv.x * 13.0 + sway)), 10.0) * smoothstep(0.25, 1.0, vUv.y) * 0.6;
  float a = (c * 0.75 + rays * 0.4) * k;
  gl_FragColor = vec4(col * a, 1.0);
}`;

export class ViewMood {
  /** @param {import('./CourseView.js').CourseView} view */
  constructor(view) {
    this.view = view;
    const th = view.theme;
    this.base = {
      fogColor: C(th.fog.color), fogNear: th.fog.near, fogFar: th.fog.far, background: C(th.background),
      hemiSky: C(th.hemi.sky), hemiGround: C(th.hemi.ground), hemiI: th.hemi.intensity,
      sunColor: C(th.sun.color), sunI: th.sun.intensity, dome: C(0xffffff), playerLight: 1,
    };
    this.cur = resolve(null, this.base);
    this.target = this.cur;
    this.moodName = null;
    this.rate = 4;
    this.uwSpec = { ...UW_DEFAULT, ...(th.underwater ?? {}) };
    this.uw = resolve(this.uwSpec, this.base);
    this.out = resolve(null, this.base);
    this.water = 0;
    this.forced = null;
    this.auto = !!th.underwater;
    this.clear = th.background;
    this.overlay = null;
    this.t = 0;
    this.playerLightBase = view.playerLight?.intensity ?? 0;
    // Themen mit Unterwasser: Überlagerung gleich anlegen und im ersten Bild (Stärke 0) mitzeichnen – der Shader wird
    // beim Levelstart übersetzt statt beim ersten Abtauchen (kein Ruckler)
    this.warm = 0;
    if (this.auto) { this.ensureOverlay().visible = true; this.warm = 2; }
  }

  setMood(name, opts = {}) {
    const def = name ? this.view.theme.moods?.[name] : null;
    // Themen ohne Stimmungen bleiben still in der Grundstimmung (dieselben Level-Daten in anderem Thema, ?theme=)
    if (name && !def && this.view.theme.moods) console.warn(`[Ansicht] Stimmung „${name}“ fehlt im Thema`);
    this.moodName = def ? name : null;
    this.target = resolve(def, this.base);
    const time = opts.time ?? 0.8;
    this.rate = time > 0 ? 3 / time : 1000;
    return this.moodName;
  }

  setUnderwater(on = true) {
    this.forced = on === 'auto' || on === null || on === undefined ? null : !!on;
    if (this.forced !== null) this.auto = false;
    else this.auto = true;
    return this.forced;
  }

  /** Kopf der Figur unter der Wasseroberfläche? */
  detect(player) {
    if (!player || player.mode !== 'swim' || !player.water) return false;
    return player.pos.y + player.half.y * 2 - 0.12 < player.water.top;
  }

  info() { return { mood: this.moodName, water: +this.water.toFixed(3), forced: this.forced, auto: this.auto, motorK: this.motorK ?? null }; }

  ensureOverlay() {
    if (this.overlay) return this.overlay;
    const mat = new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, k: { value: 0 }, aspect: { value: 16 / 9 }, col: { value: C(this.uwSpec.color) } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, fog: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = 999;
    mesh.visible = false;
    mesh.userData.owned = true;
    this.view.three.add(mesh);
    this.overlay = mesh;
    return mesh;
  }

  update(dt, player) {
    // Zeitschritt: Bild-dt bzw. die seither vergangene Simulationszeit (Tests mit step(), langsame Geräte)
    const simT = player?.level?.time;
    const sim = simT !== undefined && this.simT !== undefined ? simT - this.simT : 0;
    this.simT = simT;
    const d = Math.min(0.25, Math.max(0, dt || 0, sim));
    this.t += d;
    // Stimmung überblenden
    const k = 1 - Math.exp(-this.rate * d);
    if (this.cur !== this.target) {
      lerpInto(this.cur, this.cur, this.target, k);
      if (Math.abs(this.cur.fogFar - this.target.fogFar) < 0.01 && Math.abs(this.cur.hemiI - this.target.hemiI) < 0.001) {
        this.cur = resolve(null, this.target);
        this.target = this.cur;
      }
    }
    // Unterwasser
    const uw = player?.level?.scene?.underwater?.state;
    this.motorK = uw ? +(uw.k ?? 0).toFixed(3) : null;
    const under = this.forced ?? (this.auto ? ((uw?.k ?? 0) >= 0.3 || this.detect(player)) : false);
    const w0 = this.water;
    this.water = under ? Math.min(1, this.water + d * 3.2) : Math.max(0, this.water - d * 3.2);
    const o = lerpInto(this.out, this.cur, this.uw, this.water);
    const v = this.view, scene = v.three;
    if (scene.fog) { scene.fog.color.copy(o.fogColor); scene.fog.near = o.fogNear; scene.fog.far = o.fogFar; }
    if (scene.background?.isColor) scene.background.copy(o.background);
    this.clear = o.background.getHex();
    // Licht-Faktoren des Spielzeug-Looks (CourseView.toyLight) gelten auch für Stimmungen und Unterwasser
    v.hemi.color.copy(o.hemiSky); v.hemi.groundColor.copy(o.hemiGround); v.hemi.intensity = o.hemiI * (v.toyLight?.hemi ?? 1);
    if (v.toyLight?.skyC) v.hemi.color.lerp(v.toyLight.skyC, v.toyLight.skyMix * (1 - this.water));
    v.sun.color.copy(o.sunColor); v.sun.intensity = o.sunI * (v.toyLight?.sun ?? 1);
    const dome = v.sky?.dome?.material;
    if (dome?.color) dome.color.copy(o.dome);
    if (v.playerLight) v.playerLight.intensity = this.playerLightBase * o.playerLight;
    if (this.warm > 0) this.warm--;
    if (this.water > 0 || w0 > 0 || this.overlay?.visible) {
      const ov = this.ensureOverlay();
      ov.visible = this.water > 0.01 || this.warm > 0;
      const u = ov.material.uniforms;
      u.t.value = this.t;
      u.k.value = this.water * (this.uwSpec.caustics ?? 0.45);
      u.aspect.value = (v.layout?.w && v.layout?.h) ? v.layout.w / v.layout.h : 16 / 9;
    }
  }
}
