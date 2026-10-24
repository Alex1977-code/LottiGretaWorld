// 3D-Ansicht eines Kurs-Levels: nutzt den gemeinsamen Renderer (src/three/renderer.js, Leinwand unter der
// transparenten Phaser-Leinwand), baut Szene, Kamera (CameraRig), Licht und Himmel je Thema, verschmilzt
// statische Level-Geometrie (StaticBatcher), zeichnet Schatten-Blobs und Partikel.
//
// Schnittstelle für Bausteine/Entitäten (Präzisierung Motor):
//   view.three, view.camera, view.renderer          (auch für createAvatar)
//   view.theme                                      Farben des Themas (themes.js)
//   view.mats.world|stone|glow                      gemeinsame Vertexfarben-Materialien
//   view.addStatic(geometry, { material, castShadow, receiveShadow })   wird verschmolzen (Weltkoordinaten)
//   view.add(object3D, updateFn?)                   eigenes Objekt (bewegt/animiert); updateFn(dt, t) je Bild
//   view.remove(object3D)
//   view.onFrame(fn) → Abmelde-Funktion             je Bild fn(dt, t)
//   view.pool(name, makeTemplate, opts)             InstancePool (einmal je Name); je Bild nur sichtbare Instanzen,
//                                                   opts.lod = { dist, make(vorlage) } ferne Exemplare sparsam
//   view.shadows.add({ pos, radius, alive })        Schatten-Blob
//   view.effects.dust|sparks|debris|splash|ring|coinPop(...)
//   view.addLantern(x, y, z)                        Laternenlicht (Thema cave)
//   view.shadowProxy(root)                          Figur aus vielen Teilen: Schatten in einem Aufruf, Teile gleichen
//                                                   Materials gebündelt (view/ShadowProxy.js; Heldin, Ritt, Pflaume
//                                                   automatisch)
//   view.groupCull(instancedMesh, name)             Instanz-Gruppe: je Bild nur Exemplare im Bild (view/GroupCuller.js;
//                                                   EnemyW2 meldet sharedSlot/modelInstances selbst an)
//   view.instanceRule(name, { farHide, shadowDist, shadow })   Regel für Gruppe/Pool name (sonst LEVEL.instances)
//   view.xray(mesh, box, { min })                   Block wird durchscheinend, wenn er die Figur verdeckt (view/Xray.js)
//   view.setMood(name, { time })                    Stimmung des Themas überblenden (theme.moods; null = Grundstimmung)
//   view.setUnderwater(on)                          Unterwasser-Stimmung: true/false erzwingt, 'auto' erkennt selbst
//                                                   (Thema mit `underwater`); view.underwater → bool (view/mood.js)
//
// Spielzeug-Look (three/lib/toyLook.js, Wunsch „Figuren wie Super Mario 3D World“): Figuren-Materialien mit Randlicht,
// Glanzkante, Sättigung und weicher Lichter-Schulter; dazu freundlicheres Licht: etwas mehr (und blaueres) Himmelslicht,
// etwas weniger Sonne, weichere, bläuliche Schlagschatten. Tonemapping bleibt aus (Farben von Gelände/Himmel sind darauf
// abgestimmt; Neutral/ACES/AgX dunkeln Gras ab und vergrauen den Himmel – Vergleich: ?tone=neutral|aces|agx&exposure=…).
// Je Bild stellt syncToy() Randlicht-Farbe/-Stärke und Glanzlicht nach dem aktuellen Licht ein (folgt Stimmungen,
// Unterwasser und Level-Effekten). Thema-Feld `toy` (alle optional, Standard je Tag/Dunkel siehe toyLight()):
// { hemi, sun (Faktoren), shadow (Schattendeckkraft 0..1), sky (Blauton fürs Himmelslicht, Hex), skyMix (0..1), rim,
// spec, sat, fill, shape (Faktoren/Werte des Looks), rimColor (sonst Himmelsfarbe), tone, exposure }. ?toy=0 schaltet
// alles ab; ?toyk=rim:1.2,spec:0.8 überschreibt Werte zum Abstimmen.

import * as THREE from 'three';
import Phaser from 'phaser';
import { GAME } from '../../config.js';
import { RENDER3D } from '../../render3d.js';
import { getRenderer, mountCanvas, layoutCanvas, hideCanvas, adaptQuality, setToneMapping } from '../../three/renderer.js';
import { TOY_ENABLED, setToyLookEnv } from '../../three/lib/toyLook.js';
import { getTheme } from './themes.js';
import { Sky } from './Sky.js';
import { StaticBatcher } from './StaticBatcher.js';
import { InstancePool } from './InstancePool.js';
import { BlobShadows } from './BlobShadows.js';
import { CourseEffects } from './Effects.js';
import { CameraRig } from './CameraRig.js';
import { ViewMood } from './mood.js';
import { ViewCulling } from './Culling.js';
import { poolLod } from './lod.js';
import { ShadowProxies } from './ShadowProxy.js';
import { EntityInstancer } from './EntityInstancer.js';
import { GroupCuller } from './GroupCuller.js';
import { XrayWalls } from './Xray.js';

const SHADOW_R = 22;
const MAX_LANTERNS = 4;

/**
 * Licht- und Randlicht-Werte des Spielzeug-Looks je Thema (null bei ?toy=0). Tagesthemen: Himmelslicht +8 % und 22 % ins
 * Himmelblau gemischt (Schatten bläulich statt grau-grün), Sonne −4 %, Schlagschatten zu 88 % deckend; dunkle Themen
 * (Nacht, Spuk, Höhle, Figurenlicht) behalten ihr Licht und bekommen ein kräftigeres Randlicht (Figuren lesbar vor
 * dunklem Grund). theme.toy überschreibt einzelne Werte.
 */
export function toyLight(theme) {
  if (!TOY_ENABLED) return null;
  const dark = theme.hemi.intensity < 1 || !!theme.playerLight;
  const base = dark
    ? { hemi: 1, sun: 1, shadow: 0.94, sky: null, skyMix: 0, rim: 1.15, spec: 1.3, sat: 0.12, fill: 0.05 }
    : { hemi: 1.08, sun: 0.96, shadow: 0.88, sky: 0x8ec4ff, skyMix: 0.22, rim: 1.25, spec: 1.6, sat: 0.18, fill: 0.06 };
  const k = { tone: 'none', exposure: 1, shape: 0.6, ...base, ...(theme.toy ?? {}), ...urlToy(), dark };
  k.skyC = k.sky !== null && k.sky !== undefined && k.skyMix > 0 ? new THREE.Color(k.sky) : null;
  return k;
}

/** Abstimm-Schalter ?toyk=rim:1.2,spec:0.8,shape:0.6 (Zahlen) – überschreibt die Werte aus toyLight() für alle Themen. */
function urlToy() {
  try {
    const q = new URLSearchParams(window.location.search).get('toyk');
    if (!q) return {};
    return Object.fromEntries(q.split(',').map((p) => p.split(':')).filter(([a, b]) => a && Number.isFinite(+b)).map(([a, b]) => [a, +b]));
  } catch { return {}; }
}

const _kd = new THREE.Vector3(), _kf = new THREE.Vector3(0, 0.55, 0.84).normalize(), _rc = new THREE.Color(), WHITE = new THREE.Color(1, 1, 1);

export class CourseView {
  /**
   * @param {Phaser.Scene} scene CourseScene
   * @param {object} data LEVEL
   */
  constructor(scene, data) {
    this.scene = scene;
    this.data = data;
    this.game = scene.game;
    this.three = new THREE.Scene();
    this.three.name = `kurs:${data.id}`;
    this.theme = getTheme(data.theme);
    this.time = 0;
    this.frame = 0;
    this.layout = { w: 0, h: 0 };
    this.frameFns = [];
    this.pools = new Map();
    this.lanterns = [];

    const { renderer, canvas } = getRenderer();
    this.renderer = renderer;
    this.canvas = canvas;
    mountCanvas(this.game, canvas);
    // Spielzeug-Look: Licht-Faktoren des Themas (buildLights, mood.js), Tonemapping „Neutral“
    this.toyLight = toyLight(this.theme);
    setToneMapping(renderer, this.toyLight?.tone ?? 'none', this.toyLight?.exposure ?? 1, !!this.toyLight);

    this.camera = new THREE.PerspectiveCamera(40, GAME.width / GAME.height, 0.3, 700);
    this.rig = new CameraRig(this.camera, data.camera);

    this.mats = {
      world: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 }),
      stone: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0 }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true }),
    };
    this.buildLights();
    this.sky = new Sky(this, this.theme);
    this.static = new StaticBatcher(this);
    // Sparmaßnahmen der Darstellung (Culling, Pool-Auswahl, Instanzen, Schatten-Stellvertreter); ?optimize=0 schaltet
    // sie zum Vergleich ab (tests/course_perf.mjs COMPARE=1) – das Bild muss gleich bleiben
    this.optimize = new URLSearchParams(window.location.search).get('optimize') !== '0';
    this.culling = new ViewCulling(this);
    this.proxies = new ShadowProxies(this);
    this.instancer = new EntityInstancer(this);
    this.groups = new GroupCuller(this);
    this.instanceRules = { ...(data.instances ?? {}) };   // LEVEL.instances: { name: { farHide, shadowDist, shadow } }
    this.xrays = new XrayWalls(this);
    this.shadows = new BlobShadows(this);
    this.effects = new CourseEffects(this);
    // Stimmungen/Unterwasser (Bausteine Welt 3): nur bei Themen mit moods/underwater, sonst erst beim ersten Aufruf
    this.mood = this.theme.underwater || this.theme.moods ? new ViewMood(this) : null;

    this.onResize = () => this.syncLayout(true);
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    window.addEventListener('resize', this.onResize);
    this.syncLayout(true);
  }

  buildLights() {
    const th = this.theme, k = this.toyLight;
    this.hemi = new THREE.HemisphereLight(th.hemi.sky, th.hemi.ground, th.hemi.intensity * (k?.hemi ?? 1));
    if (k?.skyC) this.hemi.color.lerp(k.skyC, k.skyMix);
    this.sun = new THREE.DirectionalLight(th.sun.color, th.sun.intensity * (k?.sun ?? 1));
    this.sunDir = new THREE.Vector3(...th.sun.dir).normalize();
    this.sun.castShadow = RENDER3D.shadows && th.shadows;
    if (k) this.sun.shadow.intensity = k.shadow;
    const sc = this.sun.shadow.camera;
    sc.left = -SHADOW_R; sc.right = SHADOW_R; sc.top = SHADOW_R; sc.bottom = -SHADOW_R; sc.near = 1; sc.far = 120;
    this.sun.shadow.mapSize.set(RENDER3D.shadowMapSize, RENDER3D.shadowMapSize);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.texel = (2 * SHADOW_R) / RENDER3D.shadowMapSize;
    this.three.add(this.hemi, this.sun, this.sun.target);
    if (th.playerLight) {
      const l = th.playerLight;
      this.playerLight = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
      this.three.add(this.playerLight);
    }
    if (th.lanternLight) {
      const l = th.lanternLight;
      for (let i = 0; i < MAX_LANTERNS; i++) {
        const pl = new THREE.PointLight(l.color, 0, l.distance, 2);
        this.three.add(pl);
        this.lanterns.push({ light: pl, pos: null });
      }
      this.lanternSpots = [];
    }
  }

  // ------------------------------------------------------------------ Schnittstelle für Bausteine

  addStatic(geometry, opts) { this.static.add(geometry, opts); }

  add(obj, update) {
    this.three.add(obj);
    if (update) this.frameFns.push({ obj, fn: update });
    return obj;
  }

  remove(obj) {
    obj.parent?.remove(obj);
    this.frameFns = this.frameFns.filter((f) => f.obj !== obj);
  }

  onFrame(fn) {
    const e = { obj: null, fn };
    this.frameFns.push(e);
    return () => { this.frameFns = this.frameFns.filter((f) => f !== e); };
  }

  /** Instanz-Pool je Name (Vorlage wird beim ersten Aufruf gebaut). */
  pool(name, makeTemplate, opts = {}) {
    let p = this.pools.get(name);
    if (!p) {
      // Detailstufe ferner Exemplare: eigene Angabe (lod, false = keine) oder Motor-Vorgabe nach Name (view/lod.js)
      p = new InstancePool(this.three, makeTemplate(), { name, ...opts, lod: opts.lod === undefined ? poolLod(name) : opts.lod || null });
      this.pools.set(name, p);
    }
    return p;
  }

  /** Instanz-Gruppe (InstancedMesh vieler Exemplare) je Bild auswählen lassen (view/GroupCuller.js). */
  groupCull(im, name) { return this.groups.add(im, name); }

  /** Regel für Instanz-Gruppe/Pool name: { farHide, shadowDist, shadow } (null = keine). */
  instanceRule(name, rule) { if (rule) this.instanceRules[name] = rule; else delete this.instanceRules[name]; }

  /** Durchsicht: mesh wird durchscheinend, solange box zwischen Kamera und Figur liegt (view/Xray.js). */
  xray(mesh, box, opts) { return this.xrays.add(mesh, box, opts); }

  /** Schatten-Stellvertreter für eine Figur aus vielen starren Teilen (view/ShadowProxy.js). */
  shadowProxy(root) { this.proxies.add(root); }

  /** Stimmung des Themas (theme.moods[name]; null = Grundstimmung) weich überblenden. */
  setMood(name, opts) { return (this.mood ??= new ViewMood(this)).setMood(name, opts); }

  /** Unterwasser-Stimmung: true/false erzwingt (Motor), 'auto' erkennt sie selbst (Kopf der Figur unter Wasser). */
  setUnderwater(on = true) { return (this.mood ??= new ViewMood(this)).setUnderwater(on); }

  get underwater() { return (this.mood?.water ?? 0) > 0.5; }

  /** Laternenlicht an (x, y, z) – im Thema cave leuchten die nächsten MAX_LANTERNS. */
  addLantern(x, y, z) { this.lanternSpots?.push(new THREE.Vector3(x, y, z)); }

  /** Nach dem Levelaufbau: verschmelzen, Hintergrund auslegen. */
  finalize(bounds) {
    this.static.build();
    this.sky.fit(bounds);
    this.bounds = bounds;
  }

  // ------------------------------------------------------------------ Je Bild

  syncLayout(force = false) {
    layoutCanvas(this.game, this.renderer, this.canvas, this.camera, this.layout, force);
  }

  /** Kamera, Licht, Himmel, Animationen, Blobs, Partikel – dann zeichnen. */
  render(dt, player, world) {
    this.time += dt;
    this.frame++;
    if (adaptQuality(this.game.loop.delta)) this.syncLayout(true);
    else if ((this.frame & 31) === 0) this.syncLayout();
    if (player) this.rig.update(dt, player, world);
    // Sonne und Schattenbereich folgen dem Kameraziel (auf Texel gerastert gegen Flimmern)
    const tg = this.rig.target;
    const t = this.texel;
    const x = Math.round(tg.x / t) * t, y = Math.round(tg.y / t) * t, z = Math.round(tg.z / t) * t;
    this.sun.target.position.set(x, y, z - 4);
    this.sun.position.set(x + this.sunDir.x * 50, y + this.sunDir.y * 50, z - 4 + this.sunDir.z * 50);
    if (this.playerLight && player) this.playerLight.position.set(player.pos.x, player.pos.y + 3.2, player.pos.z + 1.4);
    if (this.lanternSpots?.length) this.updateLanterns(tg);
    this.mood?.update(dt, player);
    if (this.toyLight) this.syncToy();
    this.sky.update(dt, this.camera);
    for (const f of this.frameFns) f.fn(dt, this.time);
    this.xrays.update(dt, player);
    if (world) this.shadows.update(world);
    this.effects.update(dt);
    this.renderer.setClearColor(this.mood?.clear ?? this.theme.background, 1);
    if (this.static.built && this.static.pending) this.static.build();   // spätes addStatic (Haken, Laufzeit)
    this.culling.begin();
    this.proxies.update();                // nach begin(): Figur-Bündel prüfen Teile gegen die Kamera-Pyramide
    this.instancer.update(this.scene.level, this.culling);
    const focus = player?.pos ?? null;
    this.groups.update(this.culling, focus);
    for (const p of this.pools.values()) p.flush?.(this.culling, focus, this.instanceRules[p.name]);
    this.renderer.render(this.three, this.camera);
    this.culling.end();
  }

  /**
   * Randlicht und Glanzlicht der Spielzeug-Materialien nach dem aktuellen Licht (je Bild, nur Lesen der Lichter):
   * Farbe = Himmelsfarbe der Hemisphäre (bzw. theme.toy.rimColor), Stärke folgt der Himmelshelligkeit (Stimmungen,
   * Level-Effekte), unter Wasser gedämpft; Glanzlicht in Sonnenfarbe, Richtung zwischen Sonne und Kamera-Vorderseite.
   */
  syncToy() {
    const k = this.toyLight, th = this.theme;
    const hemiI = this.hemi.intensity / (k.hemi || 1), sunI = this.sun.intensity / (k.sun || 1);
    const water = this.mood?.water ?? 0;
    const lit = THREE.MathUtils.clamp(0.3 + 0.7 * hemiI / 1.3, 0.4, 1.15);
    _rc.copy(this.hemi.color);
    if (k.rimColor !== undefined) _rc.lerp(k.rimColorC ??= new THREE.Color(k.rimColor), 1 - water);
    _rc.lerp(WHITE, 0.18);                 // Hauch Weiß: Spielzeug-Kante statt farbigem Schein
    const cam = this.camera;
    cam.updateMatrixWorld();
    _kd.copy(this.sunDir).transformDirection(cam.matrixWorldInverse).lerp(_kf, 0.6).normalize();
    if (_kd.z < 0.25) { _kd.z = 0.25; _kd.normalize(); }
    setToyLookEnv({
      rimColor: _rc,
      rimStrength: 0.8 * k.rim * lit * (1 - 0.4 * water),
      specStrength: 0.7 * k.spec * THREE.MathUtils.clamp(sunI / (th.sun.intensity || 1), 0.3, 1.2) * (1 - 0.3 * water),
      keyColor: this.sun.color,
      keyDir: _kd,
      saturation: k.sat,
      fill: k.fill * lit,
      rimShape: k.shape,
    });
  }

  updateLanterns(tg) {
    const spots = this.lanternSpots.slice().sort((a, b) => a.distanceToSquared(tg) - b.distanceToSquared(tg));
    const l = this.theme.lanternLight;
    this.lanterns.forEach((ln, i) => {
      const s = spots[i];
      if (s) { ln.light.position.copy(s); ln.light.intensity = l.intensity; } else ln.light.intensity = 0;
    });
  }

  /** Bildschirmposition (480x270-Logik) eines Weltpunkts – für HUD-Marker. */
  project(x, y, z) {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    return { x: ((p.x + 1) / 2) * GAME.width, y: ((1 - p.y) / 2) * GAME.height, visible: p.z < 1 };
  }

  stats() {
    const i = this.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, staticMeshes: this.static.stats.meshes, staticParts: this.static.stats.parts };
  }

  dispose() {
    this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    window.removeEventListener('resize', this.onResize);
    for (const p of this.pools.values()) p.dispose();
    this.pools.clear();
    this.proxies.dispose();
    this.instancer.dispose();
    this.groups.dispose();
    this.xrays.dispose();
    this.static.dispose();
    this.shadows.dispose();
    this.effects.dispose();
    this.sky.dispose();
    this.sun.shadow.map?.dispose();
    for (const m of Object.values(this.mats)) m.dispose();
    setToneMapping(this.renderer, 'none');
    // Übrige Geometrien/Materialien der Bausteine freigeben (geteilte Avatar-Caches nicht anfassen)
    this.three.traverse((o) => {
      if (o.userData?.owned) { o.geometry?.dispose?.(); if (o.material && !Array.isArray(o.material)) o.material.dispose?.(); }
    });
    this.three.clear();
    hideCanvas(this.renderer, this.canvas);
  }
}
