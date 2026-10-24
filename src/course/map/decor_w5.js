// Kulissen der Welt-5-Eingänge (Kurs-Karte „Lila Strand-Insel“), aufgerufen aus EntranceView.decorate():
//   seaside       5-1        Sonnenstrand: Strandkörbe, Sonnenschirme, Sandburg, Surfbretter, Bademeister-Hochsitz mit
//                            Fähnchen, Warp-Box mit fünf schwebenden Schlüsselmünzen; Wellen rollen an den Strand
//                            (def.waves), ein Wasserball hüpft
//   bigtop        5-2        Zirkuszelt (lila-weiße Bahnen, goldener Zackenbehang, Wimpelketten), oben ein wehendes
//                            Fähnchen; daneben ein Trapez-Gerüst mit zwei schwingenden Trapezen (def.trapeze)
//   bluecave      5-3        Höhleneingang in der Felswand mit blauem Lavaschein (pulsierendes Glühen, aufsteigende
//                            blaue Funken, Kristalle, Tropfsteine); Schild „ab 90 ★“ liefern die Weltdaten
//   bullcage      5-A        Arena-Käfig: Gitter (def.cage), Ecktürme mit Wimpeln, Tor mit Hörnern; die fünf
//                            Rammbock-Bullen laufen als Gegnergruppe (Weltdaten roamers)
//   savanna       5-4        Savannenberg: Röhrenkanone auf dem Gipfel (def.cannon, feuert Rauchringe), Akazien,
//                            Termitenhügel; Hasen hüpfen über die Savanne (def.bunnies, einer leuchtet grün)
//   ghostdiorama  5-Kapitän  Geisterhaus-Diorama auf Holzsockel, Kreisgeister kreisen als Ring ums Haus, ein großer
//                            Spuk lugt hinter dem Dach hervor; Krümel steht davor (def.kruemel) und erschrickt
//   mine          5-5        Minen-Eingang mit Grubenholz, Laternen, Zündkopf-Haufen mit knisternder Lunte, POW-Block,
//                            lila Ziegelwand; Loren rollen auf Schienen aus einem zweiten Stollen (def.rail)
//   lavarocks     5-B        Lava-Felsen: steigende und sinkende Steinsäulen im Lavasee (def.pillars), Pilzlingsturm
//                            mit Feuer-Werfer (def.tower), Glutfunken; die Feuer-Werfer laufen als Gegnergruppe
//   cakeisle      5-6        Riesentorte mit Kerzen (flackern), Sahnetupfen, Kirschen; Rot-Blau-Flipper-Felder
//                            (def.flipper) wechseln bei jedem Sprung der Heldin (level.onJump)
//   sneakfort     5-7        Schleich-Festung: dunkle Mauer mit Türmen, glühenden Fenstern, Suchkopf-Kanonen;
//                            Suchscheinwerfer auf dem Turm (def.lamp), dessen Lichtkegel im Takt der Kartenmusik
//                            (music.beat(), je Zählzeit eine Achtelrunde) über den Platz kreist; steht die Heldin im
//                            Lichtfleck, färbt er sich rot (Alarm) – ev.searchlight.info() für Tests
//   goldstation   5-Zug      Goldzug-Bahnhof: Gleis (def.rail), Bahnsteig mit Dach, Bahnhofshäuschen mit Uhr, goldene
//                            Lok mit zwei Münzwagen (Dampfwolken, funkelnde Münzen)
//   kipptemple    5-Burg     Ruinen-Tempel: Stufenpyramide mit Steinköpfen und Fackeln, oben der Kippquader-König, der
//                            abwechselnd nach links und rechts über die Kante kippt (roter Landeboden-Hinweis, Staub)
// Registry-Modelle der Welt 5 (models/kinds/*_w5.js) werden benutzt, sobald es sie gibt (Kulisse 'deco_w5_<kind>',
// 'trapez', 'roehrenkanone', 'suchscheinwerfer', 'kippquader', 'schluesselmuenze' …) – mit Dreiecks-Obergrenze, damit
// die Karte im Budget bleibt; sonst eigene sparsame Geometrie. Große, unbewegte Teile gehen in die verschmolzene
// statische Geometrie, bewegte sind eigene Objekte (ev.updaters), gleichartige als Instanzen (ein Zeichenaufruf).
// Wichtig: Bewegte Objekte stehen schon beim Bau an ihrer Startlage – die Fern-Ausblendung (lod.js) merkt sich die
// Lage aller Kartenobjekte beim Aufbau.

import * as THREE from 'three';
import { mix, TAU, cached, vcol, glowTexture, starShape } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { music } from '../../audio/index.js';
import { canvasTexture } from '../../three/lib/itemMaterials.js';
import { bakeModel } from './bake.js';
import { cageGeo } from './props.js';
import { LowBuild as Build, place } from './desert.js';
import { wavingFlag, flame } from './decor_w2.js';
import { buntingGeo, tombGeo } from './snow.js';
import {
  beachChairGeo, parasolGeo, towelGeo, sandcastleGeo, surfboardGeo, acaciaGeo, termiteGeo, grassTuftGeo, violetRockGeo,
  candyCaneGeo, cupcakeGeo, cherryGeo, stoneHeadGeo, jungleTreeGeo, modelTris,
} from './beach5.js';

/** Kulisse für eine Welt-5-Art bauen; false = unbekannte Art. */
export function decorateW5(ev, kind, x, y, z) {
  switch (kind) {
    case 'seaside': seaside(ev, x, y, z); return true;
    case 'bigtop': bigTop(ev, x, y, z); return true;
    case 'bluecave': blueCave(ev, x, y, z); return true;
    case 'bullcage': bullCage(ev, x, y, z); return true;
    case 'savanna': savanna(ev, x, y, z); return true;
    case 'ghostdiorama': ghostDiorama(ev, x, y, z); return true;
    case 'mine': mine(ev, x, y, z); return true;
    case 'lavarocks': lavaRocks(ev, x, y, z); return true;
    case 'cakeisle': cakeIsle(ev, x, y, z); return true;
    case 'sneakfort': sneakFort(ev, x, y, z); return true;
    case 'goldstation': goldStation(ev, x, y, z); return true;
    case 'kipptemple': kippTemple(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const glowMat = (ev, color, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, fog: true, ...extra }); ev.own.push(m); return m; };
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
// Registry-Modelle blicken nach +X, die Kulissen nach +Z (Kamera): yaw −π/2 dreht +X nach +Z
const FRONT = -Math.PI / 2;
/**
 * Schlüsselmünzen als Registry-Modell nur bis zu dieser Dreieckszahl je Münze: fünf Münzen (mit Schattenpass) sind auf
 * der Karte bis 85 m weit zu sehen – das Modell (≈ 6 k Dreiecke je Münze) wäre dort zu schwer, eigene Münzen bleiben.
 */
const COIN_TRIS = 1500;
/**
 * Registry-Modell als statische Kulisse einbacken (false, solange es das Modell nicht gibt oder es zu schwer ist).
 * tile: eigene benannte Kachel (MapBatcher) – kompakte Hülle, damit schwere Modelle nur in den Ansichten (und im
 * Schattenpass) zählen, die sie wirklich sehen, statt in jeder Ansicht ihrer 48-m-Kachel.
 */
function bake5(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, cast = true, maxTris = 8000, tile = undefined) {
  if (!hasModel(name) || modelTris(name, opts) > maxTris) return false;
  const add = (g, o) => ev.addStatic(g, { ...o, ...(cast ? {} : { castShadow: false }), ...(tile ? { tile } : {}) });
  return !!bakeModel(add, name, opts, pos, yaw, scale, state);
}
/** Registry-Modell als bewegtes Objekt; state = Objekt/String oder Funktion (dt, t) → state. null, wenn es fehlt. */
function live5(ev, name, opts, pos, yaw = FRONT, scale = 1, state = 'idle', shadow = true, maxTris = 6000, parent = null) {
  if (!hasModel(name) || modelTris(name, opts) > maxTris) return null;
  const m = getModel(name, opts ?? {});
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw;
  if (scale !== 1) m.root.scale.setScalar(scale);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = shadow && o.castShadow; });
  (parent ?? ev.view).add(m.root);
  ev.own.push(m);
  ev.updaters.push((dt, t) => m.update(dt, typeof state === 'function' ? state(dt, t) : state));
  return m;
}
/** Erstes vorhandene Registry-Modell aus [name, opts, maxTris]-Kandidaten → [name, opts] oder null. */
function pick5(...cands) {
  for (const [name, opts, max] of cands) if (hasModel(name) && modelTris(name, opts) <= max) return [name, opts];
  return null;
}
/**
 * Registry-Modell als Instanz-Vorlage (nur starre Teile, Zustand state eingefroren): je sichtbarem Mesh ein InstancedMesh
 * mit n Instanzen (Material des Modells). set(i, x, y, z, yaw, s) setzt Instanz i (Fußpunkt, Drehung um +Y, Blick
 * des Modells +X), done() meldet die Änderung. null, wenn das Modell fehlt oder mehr als maxTris Dreiecke hat.
 */
function instModel(ev, name, opts, n, { maxTris = 8000, shadow = true, state = null, label = name } = {}) {
  if (!hasModel(name) || modelTris(name, opts) > maxTris) return null;
  const m = getModel(name, opts ?? {});
  if (state) m.update?.(0, state);
  m.root.position.set(0, 0, 0); m.root.rotation.set(0, 0, 0); m.root.scale.setScalar(1);
  m.root.updateMatrixWorld(true);
  const parts = [];
  m.root.traverseVisible((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSprite) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    const im = new THREE.InstancedMesh(g, o.material, n);
    im.frustumCulled = false;
    im.castShadow = shadow && o.castShadow !== false;
    im.receiveShadow = false;
    im.renderOrder = o.renderOrder;
    im.name = `w5:${label}`;
    ev.view.add(im);
    ev.own.push(g, im);
    parts.push(im);
  });
  ev.own.push(m);   // Materialien gehören dem Modell (dispose beim Abbau)
  const mm = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  return {
    parts,
    set(i, x, y, z, yaw = 0, s = 1, rx = 0, rz = 0) {
      e.set(rx, yaw, rz, 'YXZ'); q.setFromEuler(e); v.set(x, y, z); sc.setScalar(s);
      mm.compose(v, q, sc);
      for (const im of parts) im.setMatrixAt(i, mm);
    },
    done() { for (const im of parts) im.instanceMatrix.needsUpdate = true; },
    cull(cx, cy, cz, r) { for (const im of parts) cullByView(ev, im, cx, cy, cz, r); },
  };
}
/** Instanz-Fläche (eigenes Material nach Vertexfarben), ohne Frustum-Culling (die Instanzen bewegen sich). */
function instanced(ev, geo, n, opts = {}) {
  const m = new THREE.InstancedMesh(geo, opts.material ?? vcol(opts.rough ?? 0.45, opts.extra ?? {}, opts.key ?? ''), n);
  m.frustumCulled = false;
  m.castShadow = !!opts.shadow;
  m.receiveShadow = false;
  m.name = `w5:${opts.name ?? opts.key ?? 'instanzen'}`;
  ev.view.add(m);
  ev.own.push(m);
  return m;
}
function setInst(m, i, x, y, z, ry = 0, s = 1, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ');
  _q.setFromEuler(_e);
  if (Array.isArray(s)) _s.set(s[0], s[1], s[2]); else _s.setScalar(s);
  _m4.compose(_p.set(x, y, z), _q, _s);
  m.setMatrixAt(i, _m4);
}
/** Objekt nur zeichnen, wenn seine Hüllkugel im Bild und näher als far m ist (Instanz-Flächen ohne eigenes Culling). */
function cullByView(ev, obj, cx, cy, cz, r, far = 85) {
  const F = new THREE.Frustum(), M = new THREE.Matrix4(), S = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), r);
  ev.updaters.push(() => {
    const cam = ev.view.camera;
    cam.updateMatrixWorld();
    F.setFromProjectionMatrix(M.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    obj.visible = cam.position.distanceTo(S.center) - r < far && F.intersectsSphere(S);
  });
}
/** Statische Geometrie (gecacht) an (x, y, z) einbacken. */
function addGeo(ev, key, make, x, y, z, yaw = 0, cast = true, material) {
  ev.addStatic(place(cached(key, make).clone(), x, y, z, yaw), { castShadow: cast, material });
}
/** Instanz-Flammen (ein Zeichenaufruf, unbeleuchtet), flackern über die Skalierung. spots = [[x, y, z, s], …]. */
function flames(ev, spots, name = 'flammen') {
  const geo = cached('w5m:flame', () => {
    const b = new Build();
    b.cone(0.16, 0.48, { v: (px, py) => mix(0xff5a1a, 0xffd23a, py + 0.5) }, { p: [0, 0.24, 0] }, 7);
    b.cone(0.1, 0.32, 0xfff6c0, { p: [0, 0.2, 0.06] }, 6);
    return b.geometry();
  });
  const m = instanced(ev, geo, spots.length, { name, material: glowMat(ev, 0xffffff, { vertexColors: true }) });
  const put = (t) => {
    spots.forEach(([fx, fy, fz, s = 1], i) => {
      const k = 1 + Math.sin(t * 13 + i * 1.7) * 0.1 + Math.sin(t * 7.3 + i) * 0.07;
      setInst(m, i, fx, fy, fz, t * 0.5 + i, [s * (2 - k), s * k, s * (2 - k)]);
    });
    m.instanceMatrix.needsUpdate = true;
  };
  put(0);
  ev.updaters.push((dt, t) => put(t));
  const c = spots.reduce((a, s) => [a[0] + s[0] / spots.length, a[1] + s[1] / spots.length, a[2] + s[2] / spots.length], [0, 0, 0]);
  cullByView(ev, m, c[0], c[1], c[2], 8);
  return m;
}
/** Leuchtender Schein (additives Sprite). */
function glowSprite(ev, color, size, x, y, z, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  ev.own.push(mat);
  const s = new THREE.Sprite(mat);
  s.position.set(x, y, z);
  s.scale.setScalar(size);
  ev.view.add(s);
  return s;
}
/** Rauch-/Staubwölkchen als Instanzen: emit(x, y, z, n, opts) startet Wölkchen, die aufsteigen, wachsen und vergehen. */
function puffs(ev, n, color, name = 'wolken', opts = {}) {
  const geo = cached('w5m:puff', () => new THREE.IcosahedronGeometry(0.5, 1));
  const mat = new THREE.MeshLambertMaterial({ color, transparent: true, opacity: opts.opacity ?? 0.85, depthWrite: false, emissive: opts.emissive ?? 0x000000 });
  ev.own.push(mat);
  const m = instanced(ev, geo, n, { name, material: mat });
  const P = [];
  const [ax, ay, az] = opts.at ?? [0, 0, 0];
  for (let i = 0; i < n; i++) P.push({ t: 1, life: 1, x: ax, y: ay, z: az, vx: 0, vy: 0, vz: 0, s: 1 });
  let next = 0;
  const api = {
    emit(x, y, z, k = 1, o = {}) {
      for (let j = 0; j < k; j++) {
        const p = P[next]; next = (next + 1) % n;
        p.t = 0; p.life = o.life ?? 1.4; p.x = x + (Math.random() - 0.5) * (o.spread ?? 0.4); p.y = y; p.z = z + (Math.random() - 0.5) * (o.spread ?? 0.4);
        p.vx = (o.vx ?? 0) + (Math.random() - 0.5) * (o.jitter ?? 0.6); p.vy = o.vy ?? 1.2; p.vz = (o.vz ?? 0) + (Math.random() - 0.5) * (o.jitter ?? 0.6); p.s = o.size ?? 0.8;
      }
    },
    update(dt) {
      for (let i = 0; i < n; i++) {
        const p = P[i];
        if (p.t < p.life) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy *= 0.985; }
        const u = Math.min(1, p.t / p.life);
        const s = u >= 1 ? 0 : p.s * (0.4 + u * 1.2) * (1 - u * u);
        setInst(m, i, p.x, p.y, p.z, 0, Math.max(0.0001, s));
      }
      m.instanceMatrix.needsUpdate = true;
    },
    mesh: m,
  };
  api.update(0);
  ev.updaters.push((dt) => api.update(dt));
  return api;
}
/** Tempo der Kartenmusik (Ersatzuhr, falls keine Musik läuft). */
let mapBpm = 0;
const MAP_BPM = () => mapBpm || (mapBpm = music.themeInfo?.('course_world5_map')?.bpm ?? 128);
/** Taktuhr: Zählzeit aus music.beat() (Kartenmusik), sonst aus der Bildzeit im Tempo der Kartenmusik. */
function beatNow(t) {
  const mb = music.beat();
  const useMusic = mb.bpm > 0 && mb.playing;
  return { beat: useMusic ? mb.beat : (t * MAP_BPM()) / 60, source: useMusic ? mb.source : 'zeit', theme: mb.theme ?? null, bpm: useMusic ? mb.bpm : MAP_BPM() };
}

// ------------------------------------------------------------------ 5-1 Sonnenstrand

/** Schlüsselmünze in Kartenqualität (Blick +Z): goldene Scheibe mit Schlüssel-Relief. */
function keyCoinGeo() {
  return cached('w5m:keycoin', () => {
    const b = new Build();
    b.cyl(0.42, 0.42, 0.12, { v: (x, y, z, nx, ny, nz) => (Math.abs(nz) > 0.5 ? mix(0xffc21a, 0xfff0a0, y + 0.5) : 0xd89a10) }, { r: [Math.PI / 2, 0, 0] }, 16);
    for (const s of [-1, 1]) {
      b.torus(0.12, 0.04, 0xfff6c8, { p: [0, 0.14, s * 0.07] }, 4, 10);
      b.box(0.06, 0.34, 0.03, 0xfff6c8, { p: [0, -0.08, s * 0.07] }, 0);
      b.box(0.12, 0.05, 0.03, 0xfff6c8, { p: [0.06, -0.2, s * 0.07] }, 0);
    }
    return b.geometry();
  });
}

function seaside(ev, x, y, z) {
  // Strandmöbel: Strandkörbe, Schirme mit Badetüchern, Sandburg, Surfbretter, Rettungsring (eine Kulisse)
  // Strandkörbe und Schirme: Welt-5-Modelle der Registry (strandkorb, sonnenschirm), sonst eigene Geometrie
  const CHAIRS = [[-4.6, -5.8, -0.45, 0x9a4ad8, 'lila'], [-1.8, -7.4, -0.25, 0x2ab8d8, 'blau']];
  const SHADES = [[-6.2, 1.2, 0xb46ae8, 'lila'], [0.8, -1.4, 0xff7a5a, 'rot'], [-3.4, 7.2, 0x3ad8c8, 'gruen']];
  const korb = CHAIRS.map(([px, pz, yaw, , tn]) => bake5(ev, 'strandkorb', { color: tn }, [x + px, y, z + pz], FRONT + yaw, 1.1, null, true, 5000, 'w5:strandmoebel'));
  const schirm = SHADES.map(([px, pz, , tn], i) => bake5(ev, 'sonnenschirm', { color: tn, height: 2.6, tilt: 0.1 + i * 0.04 }, [x + px, y, z + pz], FRONT + i * 1.3, 1, { sway: 0.3 }, true, 4000, 'w5:strandmoebel'));
  addGeo(ev, `w5m:beach:${korb.join()}:${schirm.join()}`, () => {
    const b = new Build();
    const put = (g, px, pz, yaw = 0) => { g.rotateY(yaw); g.translate(px, 0, pz); b.parts.push(g); };
    CHAIRS.forEach(([px, pz, yaw, col], i) => { if (!korb[i]) put(beachChairGeo(col), px, pz, yaw); });
    SHADES.forEach(([px, pz, col], i) => { if (!schirm[i]) put(parasolGeo(col), px, pz, 0); });
    put(towelGeo(0xff7ab4), -5.4, 1.6, 0.3);
    put(towelGeo(0x3ac8e8), 1.8, -0.8, -0.2);
    put(towelGeo(0xffd23a), -2.4, 7.8, 0.1);
    put(sandcastleGeo(1.15), -6.6, 4.6, 0.3);
    put(surfboardGeo(0xff8a3a), 3.6, -9.6, 0.4); put(surfboardGeo(0x8a5ae8), 4.6, -8.8, -0.3);
    return b.geometry();
  }, x, y, z);
  // Bademeister-Hochsitz mit Fähnchen
  addGeo(ev, 'w5m:lifeguard', () => {
    const b = new Build();
    for (const [px, pz] of [[-0.7, -0.6], [0.7, -0.6], [-0.7, 0.6], [0.7, 0.6]]) b.cyl(0.07, 0.09, 2.4, 0xf6f2ea, { p: [px, 1.2, pz], r: [pz * 0.1, 0, -px * 0.1] }, 5);
    b.box(1.8, 0.14, 1.6, 0xd8a46a, { p: [0, 2.4, 0] }, 0, 1);
    b.box(1.2, 0.7, 0.1, 0xe8283a, { p: [0, 2.85, -0.6] }, 0, 1);
    b.box(1.2, 0.18, 0.5, 0xffffff, { p: [0, 2.62, -0.2] }, 0, 1);
    for (let i = 0; i < 5; i++) b.box(0.6, 0.06, 0.12, 0xd8a46a, { p: [0, 0.4 + i * 0.42, 0.95], r: [0.4, 0, 0] }, 0);
    b.cyl(0.03, 0.03, 2.6, 0xf6f2ea, { p: [0.75, 3.7, -0.6] }, 4);
    return b.geometry();
  }, x + 4.6, y, z + 3.2, -0.3);
  wavingFlag(ev, x + 4.6 + 0.75 * Math.cos(-0.3) - 0.6 * Math.sin(-0.3) + 0.03, y + 4.65, z + 3.2 - 0.75 * Math.sin(-0.3) - 0.6 * Math.cos(-0.3), 1.1, 0.7, lilaFlagTexture());
  // Warp-Box (öffnet sich im Level mit fünf Schlüsselmünzen) und die fünf Münzen darüber (drehen sich, wippen)
  const wb = [x - 3.8, y, z - 12.2];
  if (!bake5(ev, 'warp_box', {}, wb, FRONT, 1.1, null, true, 3000)) {
    addGeo(ev, 'w5m:warpbox', () => {
      const b = new Build();
      b.box(1.4, 1.4, 1.4, { v: (px, py, pz, nx, ny) => mix(0x6a2ad8, 0xb46aff, ny * 0.4 + 0.5) }, { p: [0, 0.7, 0] }, 0.12, 1);
      b.box(1.0, 1.0, 0.06, 0xffd23a, { p: [0, 0.7, 0.71] }, 0.05, 1);
      b.cyl(0.14, 0.14, 0.08, 0x3a1a6a, { p: [0, 0.82, 0.76], r: [Math.PI / 2, 0, 0] }, 10);
      b.box(0.1, 0.26, 0.08, 0x3a1a6a, { p: [0, 0.62, 0.76] }, 0);
      return b.geometry();
    }, wb[0], wb[1], wb[2]);
  }
  const N = 5;
  const coinModel = instModel(ev, 'schluesselmuenze', {}, N, { maxTris: COIN_TRIS, label: 'schluesselmuenzen' });
  const coins = coinModel ? null : instanced(ev, keyCoinGeo(), N, { name: 'schluesselmuenzen', extra: { emissive: 0x4a3000, metalness: 0.3 }, key: 'w5keycoin', shadow: true });
  const placeCoins = (t) => {
    for (let i = 0; i < N; i++) {
      const a = (i / (N - 1) - 0.5) * 2.4;
      const cx = wb[0] + Math.sin(a) * 2.6, cy = wb[1] + 2.6 + Math.cos(a) * 1.2 + Math.sin(t * 2.2 + i) * 0.15, cz = wb[2] + 0.4;
      if (coins) setInst(coins, i, cx, cy, cz, t * 2.4 + i * 0.6);
      else coinModel.set(i, cx, cy - 0.48 * 0.95, cz, t * 2.4 + i * 0.6, 0.95);   // Modell: Fußpunkt, Münzmitte 0,48 m darüber
    }
    if (coins) coins.instanceMatrix.needsUpdate = true; else coinModel.done();
  };
  placeCoins(0);
  ev.updaters.push((dt, t) => placeCoins(t));
  if (coins) cullByView(ev, coins, wb[0], wb[1] + 3, wb[2], 4.5);
  else coinModel.cull(wb[0], wb[1] + 3, wb[2], 4.5);
  // Wasserball hüpft über den Sand
  const ball = new THREE.Mesh(cached('w5m:beachball', () => {
    const b = new Build();
    b.sphere(0.45, (px, py, pz) => [0xe8283a, 0xffffff, 0x2a8ae8, 0xffd23a, 0xffffff, 0x3ac85a][Math.floor((Math.atan2(pz, px) + Math.PI) / (TAU / 6)) % 6], {}, 12, 8);
    return b.geometry();
  }), vcol(0.35, {}, 'w5ball'));
  ball.castShadow = true;
  ball.name = 'w5:wasserball';
  ev.view.add(ball);
  const bx0 = x - 2.6, bz0 = z + 2.8;
  const bounce = (t) => {
    const ph = (t * 0.9) % 1;
    ball.position.set(bx0 + Math.sin(t * 0.45) * 2.2, y + 0.45 + Math.abs(Math.sin(ph * Math.PI)) * 1.6, bz0 + Math.cos(t * 0.3) * 1.2);
    ball.rotation.set(t * 1.3, t * 0.7, 0);
  };
  bounce(0);
  ev.updaters.push((dt, t) => bounce(t));
  // Wellen: Schaumkämme rollen auf den Strand zu (def.waves: [{ x, z0, z1, dir: ±1 }] – Uferlinie bei x)
  for (const w of ev.def.waves ?? []) beachWaves(ev, w);
}

/** Schaumkämme, die auf eine Uferlinie (x = w.x, z0..z1) zurollen und dabei flacher werden. */
function beachWaves(ev, w) {
  const K = 4;
  const L = w.z1 - w.z0;
  const crest = cached('w5m:crest', () => {
    const b = new Build();
    b.sphere(1, 0xffffff, { s: [0.5, 0.12, 1] }, 10, 4);
    return b.geometry();
  });
  const mat = new THREE.MeshBasicMaterial({ color: 0xf6ffff, transparent: true, opacity: 0.8, depthWrite: false, fog: true });
  ev.own.push(mat);
  const m = instanced(ev, crest, K * 2, { name: 'wellen', material: mat });
  m.renderOrder = 2;
  const dir = w.dir ?? 1;   // +1: Meer liegt bei größerem x
  const put = (t) => {
    for (let i = 0; i < K * 2; i++) {
      const lane = i % 2, k = Math.floor(i / 2);
      const u = ((t * 0.22 + k / K + lane * 0.13) % 1);
      const d = (1 - u) * 9 + 0.4;
      const zc = w.z0 + L * (lane ? 0.68 : 0.3) + Math.sin(t * 0.4 + k) * 1.5;
      const len = L * 0.26 * (0.55 + u * 0.6);
      const th = 0.5 + (1 - u) * 0.9;
      setInst(m, i, w.x + dir * d, 0.04 + Math.sin(u * Math.PI) * 0.06, zc, 0, [th, u > 0.92 ? (1 - u) * 12 : 1, len]);
    }
    m.instanceMatrix.needsUpdate = true;
  };
  put(0);
  ev.updaters.push((dt, t) => put(t));
  cullByView(ev, m, w.x + dir * 5, 0, (w.z0 + w.z1) / 2, L / 2 + 6);
}

let lilaFlagTex = null;
function lilaFlagTexture() {
  if (lilaFlagTex) return lilaFlagTex;
  lilaFlagTex = canvasTexture('w5:flag', 128, 80, (ctx, w, h) => {
    ctx.fillStyle = '#9a4ad8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, h * 0.62, w, h * 0.14);
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    const cx = w * 0.42, cy = h * 0.34, R = h * 0.22, r = R * 0.45;
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  });
  return lilaFlagTex;
}

// ------------------------------------------------------------------ 5-2 Zirkuszelt mit Trapezen

function bigTop(ev, x, y, z) {
  const R = 4.2, WH = 3.0, RH = 3.6;
  addGeo(ev, 'w5m:bigtop', () => {
    const b = new Build();
    const stripe = (px, py, pz) => (Math.floor((Math.atan2(pz, px) + Math.PI) / (TAU / 16)) % 2 ? 0x9a4ad8 : 0xfff6ff);
    b.add(new THREE.CylinderGeometry(R, R + 0.1, WH, 32, 1, true), stripe, { p: [0, WH / 2, 0] });
    // Dach: Kegel mit Bahnen, goldener Rand, Zackenbehang
    b.add(new THREE.ConeGeometry(R + 0.5, RH, 32, 1, true), (px, py, pz) => (Math.floor((Math.atan2(pz, px) + Math.PI) / (TAU / 16)) % 2 ? 0xfff6ff : 0xb46ae8), { p: [0, WH + RH / 2 - 0.05, 0] });
    b.torus(R + 0.45, 0.12, 0xffc21a, { p: [0, WH - 0.04, 0], r: [Math.PI / 2, 0, 0] }, 4, 32);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * TAU;
      b.cone(0.32, 0.5, i % 2 ? 0xffc21a : 0xe8283a, { p: [Math.cos(a) * (R + 0.42), WH - 0.32, Math.sin(a) * (R + 0.42)], r: [Math.PI, 0, 0], s: [1, 1, 0.3] }, 3);
    }
    b.sphere(0.32, 0xffc21a, { p: [0, WH + RH + 0.1, 0] }, 10, 6);
    b.cyl(0.05, 0.05, 1.6, 0xf6f2ea, { p: [0, WH + RH + 0.9, 0] }, 5);
    // Eingang vorn (+Z): dunkle Öffnung mit gerafften roten Vorhängen und goldenem Bogen
    const door = new THREE.Shape();
    door.moveTo(-1.1, 0); door.lineTo(-1.1, 1.6); door.absarc(0, 1.6, 1.1, Math.PI, 0, true); door.lineTo(1.1, 0); door.lineTo(-1.1, 0);
    b.extrude(door, 0.12, 0x1a0a22, { p: [0, 0, R + 0.02] }, 0, 10);
    for (const s of [-1, 1]) b.add(new THREE.ConeGeometry(0.55, 2.6, 8, 1, true), 0xd8283a, { p: [s * 1.25, 1.3, R + 0.12], s: [1, 1, 0.35] });
    b.torus(1.2, 0.08, 0xffc21a, { p: [0, 1.6, R + 0.14] }, 4, 16, Math.PI);
    // Sterne auf der Wand
    for (const a of [0.9, 2.2, -0.9, -2.2]) b.extrude(starShape(0.32, 0.14), 0.04, 0xffd23a, { p: [Math.sin(a) * (R + 0.06), 1.9, Math.cos(a) * (R + 0.06)], r: [0, a, 0] }, 0, 1);
    // Wimpelketten vom Mast zu vier Pfosten
    for (const a of [0.6, 2.5, 3.8, 5.6]) {
      const px = Math.cos(a) * (R + 2.2), pz = Math.sin(a) * (R + 2.2);
      b.cyl(0.07, 0.09, 2.6, 0xf6f2ea, { p: [px, 1.3, pz] }, 5);
      b.sphere(0.12, 0xffc21a, { p: [px, 2.66, pz] }, 6, 4);
      const g = buntingGeo(Math.hypot(px, pz) + 0.5, 0.5, Math.round(a * 10));
      g.rotateZ(-Math.atan2(WH + RH - 2.6, R + 2.2) * 0.9);
      g.rotateY(-a);
      g.translate(px / 2, (WH + RH + 2.6) / 2 - 0.2, pz / 2);
      b.parts.push(g);
    }
    return b.geometry();
  }, x, y, z);
  solidCyl(ev, x, z, R + 0.2, y, y + WH + RH, 'zirkuszelt');
  for (const a of [0.6, 2.5, 3.8, 5.6]) solidCyl(ev, x + Math.cos(a) * (R + 2.2), z + Math.sin(a) * (R + 2.2), 0.2, y, y + 2.7, 'pfosten');
  wavingFlag(ev, x + 0.04, y + WH + RH + 1.45, z, 1.3, 0.8, lilaFlagTexture());
  // Trapez-Gerüst (def.trapeze: [x, z, länge entlang z]) mit zwei Trapezen, die gegenläufig schwingen
  const tr = ev.def.trapeze;
  if (!tr) return;
  const [tx, tz, tl] = tr, H = 7;
  addGeo(ev, `w5m:trapezerig:${tl}`, () => {
    const b = new Build();
    for (const s of [-1, 1]) {
      b.cyl(0.12, 0.16, H, (px, py) => (Math.floor(py * 1.2 + 10) % 2 ? 0xe8283a : 0xffffff), { p: [0, H / 2, s * tl / 2] }, 8);
      b.sphere(0.22, 0xffc21a, { p: [0, H + 0.1, s * tl / 2] }, 8, 5);
      for (const k of [-1, 1]) b.cyl(0.04, 0.04, 3.2, 0xd8d0e8, { p: [k * 1.1, H / 2 - 1.8, s * tl / 2], r: [0, 0, k * 0.35] }, 4);
    }
    b.box(0.16, 0.16, tl, 0xffc21a, { p: [0, H - 0.1, 0] }, 0);
    // Netz unten
    b.box(2.6, 0.06, tl - 0.6, 0xf6eef8, { p: [0, 0.9, 0] }, 0);
    for (let i = 0; i <= 6; i++) b.box(2.6, 0.04, 0.03, 0xb48ad6, { p: [0, 0.94, -tl / 2 + 0.3 + (i / 6) * (tl - 0.6)] }, 0);
    for (const sx of [-1.3, 1.3]) for (const sz of [-tl / 2 + 0.3, tl / 2 - 0.3]) b.cyl(0.04, 0.04, 0.9, 0x8a6aa8, { p: [sx, 0.45, sz] }, 4);
    return b.geometry();
  }, tx, y, tz);
  solidCyl(ev, tx, tz - tl / 2, 0.3, y, y + H, 'trapezmast'); solidCyl(ev, tx, tz + tl / 2, 0.3, y, y + H, 'trapezmast');
  const swings = [];
  for (const [k, dz] of [[0, -tl * 0.22], [1, tl * 0.22]]) {
    const pivot = new THREE.Group();
    pivot.position.set(tx, y + H - 0.1, tz + dz);
    pivot.name = 'w5:trapez';
    ev.view.add(pivot);
    const m = live5(ev, 'trapez', { length: 3, width: 1.2, color: k ? 'blau' : 'rot' }, [0, 0, 0], Math.PI / 2, 1, { rider: false }, true, 4000, pivot);
    if (!m) {
      const mesh = new THREE.Mesh(cached('w5m:trapezbar', () => {
        const b = new Build();
        for (const s of [-1, 1]) b.cyl(0.025, 0.025, 3, 0xf6eef8, { p: [0, -1.5, s * 0.6] }, 4);
        b.cyl(0.06, 0.06, 1.3, 0xffc21a, { p: [0, -3, 0], r: [Math.PI / 2, 0, 0] }, 8);
        return b.geometry();
      }), vcol(0.4, {}, 'w5trapez'));
      mesh.castShadow = true;
      pivot.add(mesh);
    }
    swings.push([pivot, k]);
  }
  ev.updaters.push((dt, t) => { for (const [p, k] of swings) p.rotation.z = Math.sin(t * 1.6 + k * Math.PI) * 0.6; });
}

// ------------------------------------------------------------------ 5-3 Höhleneingang mit blauem Lavaschein

function blueCave(ev, x, y, z) {
  addGeo(ev, 'w5m:bluecave', () => {
    const b = new Build();
    // Felsrahmen um den Bogen (violette Brocken), dunkle Öffnung, Tropfsteine
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI - (i / 10) * Math.PI;
      const r = 2.7 + (i % 3) * 0.12;
      b.add(new THREE.DodecahedronGeometry(0.7 + (i % 2) * 0.2, 0), { v: (px, py, pz, nx, ny) => mix(0x5a3488, 0xb48ad6, Math.max(0, ny) * 0.6 + 0.2) },
        { p: [Math.cos(a) * r, 0.2 + Math.sin(a) * r * 1.12, 0.35], r: [i, i * 2, 0], s: [1.1, 1, 0.8] });
    }
    const hole = new THREE.Shape();
    hole.moveTo(-2.2, 0); hole.lineTo(-2.2, 1.9); hole.absarc(0, 1.9, 2.2, Math.PI, 0, true); hole.lineTo(2.2, 0); hole.lineTo(-2.2, 0);
    b.extrude(hole, 0.2, 0x0e0a22, { p: [0, 0, 0.1] }, 0, 12);
    for (let i = 0; i < 7; i++) b.cone(0.16 + (i % 3) * 0.06, 0.6 + (i % 2) * 0.5, 0x4a3a7a, { p: [-1.6 + i * 0.53, 3.7 - (i % 2) * 0.25 - Math.abs(i - 3) * 0.12, 0.45], r: [Math.PI, 0, 0] }, 6);
    // Schwelle: blaue Lavarinne, die aus der Höhle läuft (Rand aus Basalt)
    b.box(5.2, 0.2, 1.6, 0x2a2240, { p: [0, 0.1, 1.2] }, 0.05, 1);
    for (const s of [-1, 1]) b.add(new THREE.DodecahedronGeometry(0.5, 0), 0x3a2e58, { p: [s * 2.9, 0.3, 1.0], r: [s, 1, 0] });
    return b.geometry();
  }, x, y, z);
  // leuchtende Teile: Lavarinne, Kristallgruppen (Material 'glow')
  addGeo(ev, 'w5m:bluecaveglow', () => {
    const b = new Build();
    b.box(3.6, 0.04, 1.1, { v: (px, py, pz) => mix(0x2a8aff, 0x9af0ff, (Math.sin(px * 3) + 1) * 0.3 + 0.2) }, { p: [0, 0.22, 1.15] }, 0);
    for (const [px, pz, s] of [[-3.4, 0.9, 1], [3.5, 1.2, 0.8], [-2.9, 2.6, 0.6]]) {
      for (let k = 0; k < 4; k++) {
        const a = k * 1.7, h = s * (0.8 + (k % 3) * 0.4);
        b.add(new THREE.OctahedronGeometry(0.22 * s, 0), { v: (qx, qy) => mix(0x2a5aff, 0xa8f4ff, qy / h + 0.5) }, { p: [px + Math.cos(a) * 0.3 * s, h * 0.45, pz + Math.sin(a) * 0.25 * s], s: [1, h / (0.44 * s), 1], r: [0.3 * Math.sin(a), 0, 0.3 * Math.cos(a)] });
      }
    }
    return b.geometry();
  }, x, y, z, 0, false, 'glow');
  solidBox(ev, x - 3.6, y, z - 1, x + 3.6, y + 4.8, z + 0.9, 'hoehlenfels');
  // pulsierendes blaues Glühen in der Öffnung, Schein davor
  const inner = new THREE.Mesh(cached('w5m:caveinner', () => {
    const s = new THREE.Shape();
    s.moveTo(-2.0, 0); s.lineTo(-2.0, 1.9); s.absarc(0, 1.9, 2.0, Math.PI, 0, true); s.lineTo(2.0, 0); s.lineTo(-2.0, 0);
    const g = new THREE.ShapeGeometry(s, 12);
    const P = g.attributes.position, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) U.setXY(i, (P.getX(i) + 2) / 4, P.getY(i) / 3.9);   // Textur über die ganze Öffnung
    return g;
  }), new THREE.MeshBasicMaterial({ map: caveGlowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
  ev.own.push(inner.material);
  inner.position.set(x, y, z + 0.32);
  inner.name = 'w5:hoehlenschein';
  ev.view.add(inner);
  const halo = glowSprite(ev, 0x4aa8ff, 6.5, x, y + 1.6, z + 1.4, 0.55);
  // aufsteigende blaue Funken (Instanzen)
  const N = 10;
  const sparks = instanced(ev, cached('w5m:spark', () => new THREE.OctahedronGeometry(0.08, 0)), N, { name: 'blaue_funken', material: glowMat(ev, 0x8ae8ff) });
  const seeds = Array.from({ length: N }, (_, i) => [((i * 0.37) % 1) * 3.2 - 1.6, (i * 0.61) % 1, 0.6 + (i % 3) * 0.25]);
  const glowUp = (t) => {
    const k = 0.75 + 0.25 * Math.sin(t * 2.3) + 0.08 * Math.sin(t * 7.1);
    inner.material.opacity = k;
    halo.material.opacity = 0.35 + 0.25 * k;
    halo.scale.setScalar(6 + Math.sin(t * 2.3) * 0.6);
    for (let i = 0; i < N; i++) {
      const [sx, ph, sp] = seeds[i];
      const u = (t * sp * 0.35 + ph) % 1;
      setInst(sparks, i, x + sx + Math.sin(t * 2 + i) * 0.2, y + 0.3 + u * 4.2, z + 1.2 + u * 0.6, t + i, u > 0.85 ? (1 - u) * 6.6 : 1);
    }
    sparks.instanceMatrix.needsUpdate = true;
  };
  glowUp(0);
  ev.updaters.push((dt, t) => glowUp(t));
  cullByView(ev, sparks, x, y + 2, z + 1.4, 4);
}

let caveTex = null;
function caveGlowTexture() {
  if (caveTex) return caveTex;
  caveTex = canvasTexture('w5:caveglow', 128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h * 0.95, 4, w / 2, h * 0.9, h * 0.95);
    g.addColorStop(0, 'rgba(170,240,255,1)'); g.addColorStop(0.35, 'rgba(60,150,255,0.9)'); g.addColorStop(0.75, 'rgba(30,40,140,0.6)'); g.addColorStop(1, 'rgba(10,10,40,0.2)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  return caveTex;
}

// ------------------------------------------------------------------ 5-A Arena-Käfig

function bullCage(ev, x, y, z) {
  const cage = ev.def.cage ?? [];
  for (const [x0, z0, x1, z1] of cage) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cg = cageGeo(len, 2.1);
    const col = cg.attributes.color;
    for (let i = 0; i < col.count; i++) { const r = col.getX(i); col.setXYZ(i, Math.min(1, r * 0.75), Math.min(1, r * 0.55), Math.min(1, r * 0.95)); }
    ev.addStatic(place(cg, (x0 + x1) / 2, y, (z0 + z1) / 2, Math.atan2(-(z1 - z0), x1 - x0)), { castShadow: true });
  }
  // Ecktürme (Ecken des Gitters), Manegen-Ring auf dem Sand, Tor mit Hörnern an der Öffnung (def.gateAt)
  addGeo(ev, `w5m:cagering:${ev.id}`, () => {
    const b = new Build();
    b.torus(5.6, 0.1, 0xe8283a, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.2] }, 3, 40);
    b.torus(5.9, 0.06, 0xffffff, { p: [0, 0.03, 0], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.2] }, 3, 40);
    return b.geometry();
  }, x, y, z, 0, false);
  for (const [cx, cz] of ev.def.towers ?? []) {
    addGeo(ev, 'w5m:cagetower', () => {
      const b = new Build();
      b.cyl(0.38, 0.45, 2.8, { v: (px, py) => mix(0x6a5a7a, 0x9a8aa8, py / 2.8 + 0.5) }, { p: [0, 1.4, 0] }, 8);
      b.cone(0.55, 0.8, 0x9a4ad8, { p: [0, 3.2, 0] }, 8);
      b.cyl(0.02, 0.02, 0.8, 0xf6f2ea, { p: [0, 3.9, 0] }, 3);
      b.cone(0.18, 0.5, 0xffc21a, { p: [0.22, 4.1, 0], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.2] }, 3);
      return b.geometry();
    }, cx, y, cz);
    solidCyl(ev, cx, cz, 0.45, y, y + 3.2, 'turm');
  }
  const ga = ev.def.gateAt;
  if (ga) {
    const [gx, gz, gyaw] = ga;
    addGeo(ev, 'w5m:cagegate', () => {
      const b = new Build();
      for (const s of [-1, 1]) {
        // Pfeiler (rot-weiß gestreift) mit Bullenkopf und Hörnern obenauf
        b.cyl(0.42, 0.5, 3.0, (px, py) => (Math.floor(py * 1.6 + 10) % 2 ? 0xe8283a : 0xfff6ff), { p: [0, 1.5, s * 3.3] }, 10);
        b.cyl(0.6, 0.55, 0.3, 0xffc21a, { p: [0, 3.15, s * 3.3] }, 10);
        b.sphere(0.5, { v: (px, py, pz, nx, ny) => mix(0x7a3a22, 0xb8643a, ny * 0.5 + 0.5) }, { p: [0, 3.7, s * 3.3], s: [1, 0.85, 1.1] }, 9, 6);
        b.sphere(0.24, 0xf0b090, { p: [0.36, 3.55, s * 3.3], s: [0.8, 0.7, 1.2] }, 7, 4);
        for (const k of [-1, 1]) b.tube([[0, 3.95, s * 3.3 + k * 0.35], [0, 4.2, s * 3.3 + k * 0.75], [0.1, 4.65, s * 3.3 + k * 0.85]], 0.08, 0xf6ecd8, null, 6, 4);
      }
      // Wimpel-Bogen über der Öffnung
      const pts = [];
      for (let i = 0; i <= 8; i++) { const u = i / 8; pts.push([0, 3.3 + Math.sin(u * Math.PI) * 1.1, -3.3 + u * 6.6]); }
      b.tube(pts, 0.05, 0xffc21a, null, 16, 4);
      for (let i = 1; i < 8; i++) { const [px, py, pz] = pts[i]; b.cone(0.22, 0.45, i % 2 ? 0xe8283a : 0x9a4ad8, { p: [px, py - 0.26, pz], r: [Math.PI, 0, 0], s: [0.2, 1, 1] }, 3); }
      return b.geometry();
    }, gx, y, gz, gyaw ?? 0);
    for (const s of [-1, 1]) solidCyl(ev, gx + Math.sin(gyaw ?? 0) * s * 3.3, gz + Math.cos(gyaw ?? 0) * s * 3.3, 0.55, y, y + 4.2, 'tor');
  }
}

// ------------------------------------------------------------------ 5-4 Savannenberg mit Röhrenkanone und Hasen

/** Hase in Kartenqualität (Blick +X): runder Körper, Kopf, lange Ohren, Puschelschwanz. */
function bunnyGeo() {
  return cached('w5m:bunny', () => {
    const b = new Build();
    b.sphere(0.24, { v: (px, py, pz, nx, ny) => mix(0xd8a87a, 0xf6e2c8, ny * 0.5 + 0.5) }, { p: [0, 0.26, 0], s: [1.25, 1, 1] }, 9, 6);
    b.sphere(0.17, 0xf0d2b0, { p: [0.26, 0.44, 0] }, 8, 6);
    for (const s of [-1, 1]) {
      b.sphere(0.06, 0xf6e2c8, { p: [0.2, 0.7, s * 0.07], s: [0.8, 3.2, 1.2], r: [s * 0.2, 0, -0.25] }, 6, 4);
      b.sphere(0.035, 0x1a1012, { p: [0.4, 0.48, s * 0.08] }, 5, 3);
    }
    b.sphere(0.09, 0xffffff, { p: [-0.3, 0.32, 0] }, 6, 4);
    return b.geometry();
  });
}

function savanna(ev, x, y, z) {
  // Röhrenkanone auf dem Gipfel (def.cannon: [x, y, z, yaw]) – feuert alle paar Sekunden einen Rauchring
  const cn = ev.def.cannon;
  let puff = null;
  if (cn) {
    const [cx, cy, cz, cyaw = 0.7] = cn;
    const pivot = new THREE.Group();
    pivot.position.set(cx, cy, cz);
    pivot.rotation.y = cyaw;
    pivot.name = 'w5:roehrenkanone';
    ev.view.add(pivot);
    let fireK = 0, next = 1.5;
    const CS = 1.3;   // Maßstab des Registry-Modells (Höhe 2,2 m → 2,9 m)
    const model = live5(ev, 'roehrenkanone', { height: 2.2, radius: 1, color: 'gruen' }, [0, 0, 0], FRONT, CS,
      () => (fireK > 0 ? { anim: 'fire', fire: Math.min(1, 1 - fireK) } : { anim: 'load', k: Math.max(0, 1 - (next - ev.view.time) / 1.2) * 0.8 }), true, 8000, pivot);
    let barrel = null;
    if (!model) {
      addGeo(ev, 'w5m:cannonbase', () => {
        const b = new Build();
        b.cyl(1.3, 1.5, 0.7, { v: (px, py) => mix(0x8a5a36, 0xb87a48, py + 0.5) }, { p: [0, 0.35, 0] }, 12);
        b.cyl(1.0, 1.0, 0.3, 0x3a3a48, { p: [0, 0.85, 0] }, 12);
        return b.geometry();
      }, cx, cy, cz);
      barrel = new THREE.Mesh(cached('w5m:cannonbarrel', () => {
        const b = new Build();
        b.cyl(0.85, 0.85, 3.0, { v: (px, py, pz, nx) => mix(0x1e8a3a, 0x5ae06a, nx * 0.4 + 0.5) }, { p: [0, 1.5, 0] }, 14, true);
        b.torus(0.92, 0.16, 0xffc21a, { p: [0, 3.0, 0], r: [Math.PI / 2, 0, 0] }, 5, 16);
        b.torus(0.9, 0.1, 0xffc21a, { p: [0, 0.9, 0], r: [Math.PI / 2, 0, 0] }, 4, 16);
        b.cyl(0.75, 0.75, 0.05, 0x0e1a12, { p: [0, 2.9, 0] }, 14);
        return b.geometry();
      }), vcol(0.35, {}, 'w5cannon'));
      barrel.castShadow = true;
      barrel.position.set(0, 0.9, 0);
      barrel.rotation.z = -0.75;
      pivot.add(barrel);
    }
    solidCyl(ev, cx, cz, 1.4, cy, cy + 3, 'kanone');
    puff = puffs(ev, 14, 0xf8f6ff, 'kanonenrauch', { at: [cx, cy + 3, cz] });
    const mouth = new THREE.Vector3();
    ev.updaters.push((dt, t) => {
      fireK = Math.max(0, fireK - dt * 2);
      if (barrel) { barrel.scale.set(1 + fireK * 0.12, 1 - fireK * 0.15, 1 + fireK * 0.12); barrel.position.x = -fireK * 0.3; }
      if (t > next) {
        next = t + 4.2;
        fireK = 1;
        if (model) mouth.set(0, 2.2 * CS + 0.2, 0).add(pivot.position);
        else mouth.set(Math.sin(0.75) * 3.4, 0.9 + Math.cos(0.75) * 3.4, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), cyaw).add(pivot.position);
        const dx = model ? 0 : Math.cos(cyaw) * 2.2, dz = model ? 0 : -Math.sin(cyaw) * 2.2;
        puff.emit(mouth.x, mouth.y, mouth.z, 6, { vx: dx, vz: dz, vy: 2.4, life: 1.6, size: 1.1, spread: 0.6 });
      }
    });
  }
  // Akazien und Termitenhügel am Berg (Registry-Kulisse, sonst eigene Geometrie)
  for (const [px, py, pz, h] of ev.def.acacias ?? []) {
    if (!bake5(ev, 'deco_w5_akazie', { height: h }, [px, py, pz], FRONT + px, 1, null, true, 3000)) ev.addStatic(place(acaciaGeo(h, Math.round(px * 7 + pz)), px, py, pz, px), { castShadow: true });
  }
  for (const [px, py, pz, s] of ev.def.termites ?? []) {
    // Termitenhügel-Modell (≈ 2,7 k Dreiecke) nur, wenn es leicht genug ist – die Hügel liegen in der großen Kulissen-Kachel
    const tm = pick5(['deco_w5_termitenhuegel', { size: 1.4 * s }, 1200], ['termitenhuegel', { height: 2.2 * s }, 1200]);
    if (!tm || !bake5(ev, tm[0], tm[1], [px, py, pz], FRONT + px * 3, 1, null, true, 3000)) ev.addStatic(place(termiteGeo(s), px, py, pz, px * 3), { castShadow: true });
    ev.addStatic(place(grassTuftGeo(1, Math.round(px)), px + 0.9, py, pz + 0.6), { castShadow: false });
  }
  // Hasen hüpfen im Kreis über die Savanne (def.bunnies: [[x, z, r], …]); der letzte leuchtet grün
  const bun = ev.def.bunnies ?? [];
  if (bun.length) {
    const m = instanced(ev, bunnyGeo(), bun.length, { name: 'hasen', key: 'w5bunny', shadow: true });
    const green = instanced(ev, cached('w5m:bunnyglow', () => new THREE.SphereGeometry(0.42, 10, 6)), 1, { name: 'hasenschein', material: glowMat(ev, 0x7aff7a, { transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }) });
    const put = (t) => {
      bun.forEach(([bx, bz, r], i) => {
        const sg = i % 2 ? -1 : 1;
        const a = t * (0.32 + i * 0.05) * sg + i * 2.1;
        const hop = Math.abs(Math.sin(t * 7 + i));
        const px = bx + Math.cos(a) * r, pz = bz + Math.sin(a) * r;
        const yaw = Math.atan2(-sg * Math.cos(a), -sg * Math.sin(a));   // Blick entlang der Laufrichtung
        setInst(m, i, px, y + hop * 0.35, pz, yaw, 1.4, 0, (hop - 0.5) * 0.3);
        if (i === bun.length - 1) setInst(green, 0, px, y + 0.35 + hop * 0.35, pz, 0, 1 + Math.sin(t * 5) * 0.1);
      });
      m.instanceMatrix.needsUpdate = true; green.instanceMatrix.needsUpdate = true;
    };
    put(0);
    ev.updaters.push((dt, t) => put(t));
    const c = bun.reduce((a, b) => [a[0] + b[0] / bun.length, a[1] + b[1] / bun.length], [0, 0]);
    cullByView(ev, m, c[0], y, c[1], 12);
    cullByView(ev, green, c[0], y, c[1], 12);
  }
  void x; void z;
}

// ------------------------------------------------------------------ 5-Kapitän Geisterhaus-Diorama

/** Kreisgeist in Kartenqualität (Blick +Z): Tropfenform mit Wellensaum, Augen, Mund. */
function ghostGeo() {
  return cached('w5m:ghost', () => {
    const b = new Build();
    b.lathe([[0, 1.0], [0.24, 0.96], [0.4, 0.8], [0.46, 0.5], [0.44, 0.22], [0.36, 0.0], [0, 0.04]], { v: (px, py) => mix(0xd8d2f4, 0xffffff, py) }, null, 12, 1);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.sphere(0.13, 0xe6e2fa, { p: [Math.cos(a) * 0.32, 0.02, Math.sin(a) * 0.32] }, 6, 3); }
    for (const s of [-1, 1]) {
      b.sphere(0.07, 0x1a1a2a, { p: [s * 0.14, 0.62, 0.38], s: [0.8, 1.2, 0.5] }, 7, 5);
      b.sphere(0.045, 0xff9ab8, { p: [s * 0.25, 0.48, 0.36], s: [1, 0.6, 0.4] }, 5, 3);
    }
    b.sphere(0.08, 0xe8285a, { p: [0, 0.42, 0.41], s: [1.2, 0.8, 0.4] }, 7, 4);
    return b.geometry();
  });
}

function ghostDiorama(ev, x, y, z) {
  const W = 7.2, D = 6.0;
  addGeo(ev, 'w5m:ghostdiorama', () => {
    const b = new Build();
    // Holzsockel mit Goldkante (Diorama), darauf Spukwiese mit Hang und Treppe
    b.box(W, 0.7, D, { v: (px, py) => mix(0x4a2a1a, 0x7a4a2c, py + 0.5) }, { p: [0, 0.35, 0] }, 0.08, 1);
    b.box(W + 0.1, 0.1, D + 0.1, 0xffc21a, { p: [0, 0.72, 0] }, 0, 1);
    b.box(W - 0.3, 0.3, D - 0.3, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0x4e4070 : 0x3a2e52) }, { p: [0, 0.9, 0] }, 0.05, 1);
    b.box(3.2, 1.2, 2.4, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0x5a4a7a : 0x40345a) }, { p: [-1.6, 1.6, -1.4] }, 0.08, 1);
    for (let i = 0; i < 4; i++) b.box(1.0, 0.3, 0.36, 0x6a5a5a, { p: [0.6, 1.2 + i * 0.3, -0.4 - i * 0.36] }, 0, 1);
    // Spukhaus auf der Anhöhe: schiefe Holzwände, Spitzdach, Türmchen, Tür
    const boards = (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0x2e2444 : Math.floor((px + pz) * 3 + 20) % 2 ? 0x5a4880 : 0x4e3e72);
    b.box(2.8, 2.2, 2.0, boards, { p: [-1.6, 3.3, -1.5], r: [0, 0, 0.03] }, 0.06, 1);
    const roof = new THREE.Shape(); roof.moveTo(-1.3, 0); roof.lineTo(0, 1.6); roof.lineTo(1.3, 0); roof.lineTo(-1.3, 0);
    b.extrude(roof, 3.2, { v: (px, py) => mix(0x1e1a36, 0x3a3462, py / 1.6) }, { p: [-1.55, 4.38, -1.5], r: [0, Math.PI / 2, 0.03] }, 0.04, 1);
    b.cyl(0.55, 0.6, 3.6, { v: (px, py) => mix(0x4a3a6a, 0x6a5590, py / 3.6 + 0.5) }, { p: [-3.0, 3.8, -1.9] }, 10);
    b.cone(0.85, 1.6, { v: (px, py) => mix(0x1e1a36, 0x3e3870, py / 1.6 + 0.5) }, { p: [-2.95, 6.4, -1.9], r: [0, 0, 0.14] }, 10);
    b.box(0.6, 1.0, 0.1, 0x1a1020, { p: [-1.2, 2.7, -0.48] }, 0, 1);
    for (const px of [-2.4, -0.5]) b.box(0.55, 0.55, 0.12, 0x2a1e30, { p: [px, 3.6, -0.48] }, 0, 1);
    // Grabsteinchen, Laterne und Zaun auf dem Sockel
    for (const [px, pz] of [[2.3, -1.9], [2.9, 0.6], [1.6, 1.8]]) { const g = tombGeo(Math.round(px * 10)); g.scale(0.6, 0.6, 0.6); g.translate(px, 1.05, pz); b.parts.push(g); }
    for (let i = 0; i < 7; i++) b.cone(0.06, 0.6, 0x2a2238, { p: [-3.2 + i * 0.55, 1.35, 2.6] }, 4);
    b.box(3.8, 0.05, 0.05, 0x2a2238, { p: [-1.55, 1.4, 2.6] }, 0);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - W / 2, y, z - D / 2, x + W / 2, y + 1.05, z + D / 2, 'diorama');
  solidBox(ev, x - 3.6, y, z - 3, x + 0.2, y + 6, z - 0.3, 'spukhaus');
  // flackernde Fenster
  const wm = glowMat(ev, 0xd8ff8a);
  const win = new THREE.Mesh(cached('w5m:ghostwin', () => {
    const b = new Build();
    for (const px of [-2.4, -0.5]) b.box(0.42, 0.42, 0.03, 0xffffff, { p: [px, 3.6, -0.41] }, 0);
    b.cyl(0.22, 0.22, 0.03, 0xffffff, { p: [-3.0, 4.6, -1.31], r: [Math.PI / 2, 0, 0] }, 10);
    return b.geometry();
  }), wm);
  win.position.set(x, y, z);
  win.name = 'w5:spukfenster';
  ev.view.add(win);
  // Kreisgeister: ein Ring aus sieben Geistern kreist ums Haus (eine Instanz-Fläche), ein großer Spuk lugt hervor
  const N = 7;
  const gh = instanced(ev, ghostGeo(), N + 1, { name: 'kreisgeister', extra: { emissive: 0x2a2a4a }, key: 'w5ghost', shadow: true });
  const hx = x - 1.6, hz = z - 1.5;
  let peek = 0;
  const put = (t) => {
    const R = 3.4 + Math.sin(t * 0.8) * 0.25;
    for (let i = 0; i < N; i++) {
      const a = t * 0.55 + (i / N) * TAU;
      setInst(gh, i, hx + Math.cos(a) * R, y + 3.4 + Math.sin(t * 2 + i) * 0.25, hz + Math.sin(a) * R * 0.85, -a - Math.PI / 2 + Math.PI, 0.75, 0, Math.sin(t * 3 + i) * 0.15);
    }
    peek = Math.max(0, Math.sin(t * 0.7)) ** 3;
    setInst(gh, N, hx + 1.2, y + 4.6 + peek * 1.6, hz - 1.3, 0.2, 1.7 + peek * 0.3, -0.1, Math.sin(t * 1.3) * 0.1);
    gh.instanceMatrix.needsUpdate = true;
  };
  put(0);
  ev.updaters.push((dt, t) => { put(t); wm.color.setHex(Math.sin(t * 6.1) + Math.sin(t * 2.3) > 1.35 ? 0xf6ffc8 : 0xc8f07a); });
  cullByView(ev, gh, hx, y + 4, hz, 6);
  // Krümel vor dem Diorama (Registry-Modell): erschrickt, wenn der große Spuk hervorlugt
  const kp = ev.def.kruemel ?? [x + 3.6, y, z + 3.6];
  if (live5(ev, 'kruemel', {}, kp, -Math.PI / 2 + 0.5, 1.6, () => (peek > 0.35 ? 'scared' : 'idle'), true, 12000)) solidCyl(ev, kp[0], kp[2], 0.45, kp[1], kp[1] + 0.9, 'kruemel');
}

// ------------------------------------------------------------------ 5-5 Minen-Eingang mit Loren

/** Lore (Blick +X): Kasten auf Rädern, beladen mit Kristallen bzw. Gold. */
function cartGeo(load = 0xb070e0) {
  return cached(`w5m:cart:${load}`, () => {
    const b = new Build();
    b.box(1.5, 0.75, 1.0, { v: (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0x6a5a62 : mix(0x7a6a72, 0xa8989e, py + 0.5)) }, { p: [0, 0.75, 0] }, 0.06, 1);
    for (const s of [-1, 1]) b.box(1.56, 0.1, 0.06, 0xb8703c, { p: [0, 0.98, s * 0.52] }, 0);
    for (const px of [-0.45, 0.45]) for (const s of [-1, 1]) b.cyl(0.2, 0.2, 0.1, 0x2a2a34, { p: [px, 0.22, s * 0.5], r: [Math.PI / 2, 0, 0] }, 8);
    for (let i = 0; i < 5; i++) b.add(new THREE.OctahedronGeometry(0.2 + (i % 2) * 0.06, 0), load, { p: [-0.45 + (i % 3) * 0.45, 1.18 + (i % 2) * 0.1, i < 3 ? -0.15 : 0.2], r: [i, i * 2, 0] });
    return b.geometry();
  });
}

function mine(ev, x, y, z) {
  addGeo(ev, 'w5m:mine', () => {
    const b = new Build();
    const wood = { v: (px, py, pz, nx, ny) => mix(0x5a3a1e, 0x9a6a3a, ny * 0.3 + 0.5) };
    // dunkle Öffnung, Holzrahmen, Streben, Schild mit gekreuzten Spitzhacken
    const hole = new THREE.Shape();
    hole.moveTo(-1.7, 0); hole.lineTo(-1.7, 2.4); hole.lineTo(-1.3, 3.0); hole.lineTo(1.3, 3.0); hole.lineTo(1.7, 2.4); hole.lineTo(1.7, 0); hole.lineTo(-1.7, 0);
    b.extrude(hole, 0.2, 0x0e0a14, { p: [0, 0, 0.1] }, 0, 4);
    for (const s of [-1, 1]) {
      b.box(0.36, 3.3, 0.4, wood, { p: [s * 1.9, 1.65, 0.35] }, 0.04, 1);
      b.box(0.24, 1.6, 0.24, wood, { p: [s * 2.5, 0.75, 0.55], r: [0, 0, s * 0.35] }, 0, 1);
    }
    b.box(4.6, 0.42, 0.5, wood, { p: [0, 3.35, 0.35] }, 0.04, 1);
    b.box(2.4, 0.8, 0.12, 0xc89a5a, { p: [0, 4.1, 0.45] }, 0.03, 1);
    for (const s of [-1, 1]) {
      b.box(0.08, 0.9, 0.05, 0x6a4424, { p: [s * 0.25, 4.1, 0.54], r: [0, 0, s * 0.7] }, 0);
      b.box(0.36, 0.1, 0.06, 0x8a8e9e, { p: [s * 0.52, 4.43, 0.55], r: [0, 0, s * 0.7] }, 0);
    }
    // Felsbrocken, lila Ziegelwand mit Riss, Zündkopf-Haufen
    for (const [px, pz, r] of [[-3.4, 1.0, 0.7], [3.3, 1.4, 0.55], [-2.8, 2.2, 0.4]]) b.add(new THREE.DodecahedronGeometry(r, 0), { v: (qx, qy, qz, nx, ny) => mix(0x6a3a96, 0xc89ae2, Math.max(0, ny) * 0.7 + 0.1) }, { p: [px, r * 0.6, pz], r: [px, pz, 0] });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) b.box(0.72, 0.36, 0.4, (row + i) % 3 ? 0x9a5ad8 : 0x8a4ac8, { p: [-5.6 + i * 0.76 + (row % 2) * 0.38, 0.18 + row * 0.38, 1.4] }, 0.02, 1);
    for (const [px, pz, py] of [[3.6, 3.0, 0.3], [4.2, 3.3, 0.3], [3.9, 3.6, 0.3], [3.95, 3.25, 0.82]]) {
      b.sphere(0.3, 0x22202a, { p: [px, py, pz] }, 9, 6);
      b.cyl(0.03, 0.03, 0.22, 0xb8a88a, { p: [px + 0.05, py + 0.36, pz], r: [0, 0, -0.3] }, 4);
      for (const s of [-1, 1]) b.sphere(0.05, 0xffffff, { p: [px + 0.25, py + 0.05, pz + s * 0.1] }, 5, 3);
    }
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 2.8, y, z - 0.6, x + 2.8, y + 4.6, z + 0.8, 'mine');
  solidCyl(ev, x + 3.9, z + 3.3, 0.8, y, y + 1.2, 'zuendkoepfe');
  bake5(ev, 'pow_block', {}, [x - 4.2, y, z + 2.8], FRONT + 0.3, 1, null, true, 3000) && solidBox(ev, x - 4.7, y, z + 2.3, x - 3.7, y + 1, z + 3.3, 'pow');
  // Laternen am Querbalken (glühen), knisternde Lunte
  addGeo(ev, 'w5m:minelamps', () => {
    const b = new Build();
    for (const s of [-1, 1]) b.sphere(0.16, 0xffd070, { p: [s * 1.4, 2.75, 0.62] }, 8, 6);
    return b.geometry();
  }, x, y, z, 0, false, 'glow');
  const fuse = glowSprite(ev, 0xffb03a, 0.7, x + 4.0, y + 1.42, z + 3.25, 0.9);
  ev.updaters.push((dt, t) => { const k = 0.6 + Math.abs(Math.sin(t * 17)) * 0.4 + Math.sin(t * 5.3) * 0.15; fuse.scale.setScalar(0.5 + k * 0.4); fuse.material.opacity = k; });
  // Gleis aus dem zweiten Stollen (def.rail: { x, z0, z1 }) mit zwei Loren, die heraus- und zurückrollen
  const rl = ev.def.rail;
  if (!rl) return;
  const { x: rx, z0, z1 } = rl;
  const L = z1 - z0;
  addGeo(ev, `w5m:minerail:${L}`, () => {
    const b = new Build();
    const hole = new THREE.Shape();
    hole.moveTo(-1.1, 0); hole.lineTo(-1.1, 1.7); hole.lineTo(1.1, 1.7); hole.lineTo(1.1, 0); hole.lineTo(-1.1, 0);
    b.extrude(hole, 0.2, 0x0e0a14, { p: [0, 0, 0.1] }, 0, 1);
    for (const s of [-1, 1]) b.box(0.26, 2.0, 0.3, 0x7a5030, { p: [s * 1.25, 1.0, 0.3] }, 0.03, 1);
    b.box(2.8, 0.3, 0.36, 0x7a5030, { p: [0, 2.05, 0.3] }, 0.03, 1);
    for (let i = 0; i < Math.round(L / 0.8); i++) b.box(1.5, 0.08, 0.26, 0x6a4628, { p: [0, 0.04, 0.4 + i * 0.8] }, 0);
    for (const s of [-1, 1]) b.box(0.07, 0.1, L, 0x9a9eae, { p: [s * 0.5, 0.12, L / 2 + 0.1] }, 0);
    // Prellbock
    b.box(1.6, 0.6, 0.3, 0xe8283a, { p: [0, 0.4, L + 0.1] }, 0.04, 1);
    b.box(1.7, 0.12, 0.32, 0xffffff, { p: [0, 0.55, L + 0.1] }, 0, 1);
    return b.geometry();
  }, rx, y, z0);
  solidBox(ev, rx - 0.9, y, z0 + L - 0.1, rx + 0.9, y + 0.7, z0 + L + 0.3, 'prellbock');
  const lore = instModel(ev, 'lore', { load: 'kristall' }, 2, { maxTris: 6000, label: 'loren' });
  const carts = lore ? null : instanced(ev, cartGeo(0xb070e0), 2, { name: 'loren', key: 'w5cart', shadow: true });
  const gold = lore ? null : instanced(ev, cached('w5m:cartgold', () => {
    const b = new Build();
    for (let i = 0; i < 4; i++) b.cyl(0.2, 0.2, 0.08, 0xffc21a, { p: [-0.4 + i * 0.26, 1.2 + (i % 2) * 0.08, (i % 2 ? 0.12 : -0.12)], r: [0.4, 0, 0.3] }, 10);
    return b.geometry();
  }), 2, { name: 'lorengold', extra: { emissive: 0x3a2400 }, key: 'w5cartgold' });
  const put = (t) => {
    for (let i = 0; i < 2; i++) {
      const ph = ((t / 9) + i * 0.5) % 1;
      // rausrollen (0–0,35), stehen (0,35–0,5), zurück (0,5–0,85), drin (0,85–1)
      let u = ph < 0.35 ? ph / 0.35 : ph < 0.5 ? 1 : ph < 0.85 ? 1 - (ph - 0.5) / 0.35 : 0;
      u = u * u * (3 - 2 * u);
      const pz = z0 - 0.6 + u * (L - 0.9 - i * 1.7);
      const rock = Math.sin(t * 14 + i) * 0.015 * (u > 0 && u < 1 ? 1 : 0);
      if (lore) { lore.set(i, rx, y + 0.17, pz, -Math.PI / 2, 1.05, 0, rock); continue; }   // Schienen-Oberkante 0,17 m
      setInst(carts, i, rx, y, pz, -Math.PI / 2, 1, 0, rock);
      setInst(gold, i, rx, y, pz, -Math.PI / 2, i ? 1 : 0.0001);
    }
    if (lore) lore.done();
    else { carts.instanceMatrix.needsUpdate = true; gold.instanceMatrix.needsUpdate = true; }
  };
  put(0);
  ev.updaters.push((dt, t) => put(t));
  if (lore) lore.cull(rx, y + 1, z0 + L / 2, L / 2 + 2);
  else { cullByView(ev, carts, rx, y + 1, z0 + L / 2, L / 2 + 2); cullByView(ev, gold, rx, y + 1, z0 + L / 2, L / 2 + 2); }
}

// ------------------------------------------------------------------ 5-B Lava-Felsen mit steigenden Steinsäulen

function lavaRocks(ev, x, y, z) {
  const pillars = ev.def.pillars ?? [];
  if (pillars.length) {
    const geo = cached('w5m:pillar', () => {
      const b = new Build();
      b.cyl(1.2, 1.35, 6, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a5a62 : mix(0x2e2428, 0x54424a, (py + 3) / 6)) }, { p: [0, -3, 0] }, 6);
      b.cyl(1.25, 1.25, 0.12, 0x8a7a82, { p: [0, 0.02, 0] }, 6);
      for (let i = 0; i < 4; i++) b.box(0.14, 0.02, 1.0, 0xff7a1a, { p: [Math.cos(i * 1.6) * 0.5, -0.4 - i * 1.1, 1.18], r: [0, 0, 0.3 * i] }, 0);
      return b.geometry();
    });
    const pm = instanced(ev, geo, pillars.length, { name: 'steinsaeulen', key: 'w5pillar', shadow: true });
    const ring = instanced(ev, cached('w5m:lavaring', () => new THREE.TorusGeometry(1.5, 0.22, 4, 14).rotateX(Math.PI / 2)), pillars.length, { name: 'glutringe', material: glowMat(ev, 0xffa03a) });
    const put = (t) => {
      pillars.forEach(([px, pz, h], i) => {
        const u = 0.5 + 0.5 * Math.sin(t * 0.55 + i * 2.2);
        setInst(pm, i, px, 0.25 + u * h, pz, i);
        setInst(ring, i, px, 0.3, pz, t * 0.4, 1 + Math.sin(t * 3 + i) * 0.06);
      });
      pm.instanceMatrix.needsUpdate = true; ring.instanceMatrix.needsUpdate = true;
    };
    put(0);
    ev.updaters.push((dt, t) => put(t));
    const c = pillars.reduce((a, p) => [a[0] + p[0] / pillars.length, a[1] + p[1] / pillars.length], [0, 0]);
    const R = Math.max(...pillars.map(([px, pz]) => Math.hypot(px - c[0], pz - c[1]))) + 3;
    cullByView(ev, pm, c[0], 3, c[1], R); cullByView(ev, ring, c[0], 0.5, c[1], R);
  }
  // Pilzlingsturm mit Feuer-Werfer obenauf (Registry-Modelle, eingebacken) bzw. Basalt-Thron
  const tw = ev.def.tower;
  if (tw) {
    const [tx, tz] = tw;
    const okT = bake5(ev, 'pilzlingsturm', { count: 5 }, [tx, y, tz], FRONT + 0.4, 1, { anim: 'idle' }, true, 6000);
    const topY = y + (okT ? 5 * 0.62 + 0.1 : 2.4);
    if (!okT) addGeo(ev, 'w5m:throne', () => { const b = new Build(); b.cyl(0.9, 1.1, 2.4, { v: (px, py) => mix(0x2e2428, 0x5a4650, py / 2.4 + 0.5) }, { p: [0, 1.2, 0] }, 7); return b.geometry(); }, tx, y, tz);
    bake5(ev, 'feuer_werfer', {}, [tx, topY, tz], FRONT + 0.4, 1, { anim: 'idle' }, true, 5000);
    solidCyl(ev, tx, tz, 0.9, y, topY + 1.4, 'werferturm');
  }
  // Feuerschalen am Steg, Glutfunken aus dem Lavasee
  for (const [bx, bz] of ev.def.braziers ?? []) {
    addGeo(ev, 'w5m:brazier', () => {
      const g = new Build();
      g.cyl(0.18, 0.26, 1.1, 0x3a3036, { p: [0, 0.55, 0] }, 7);
      g.cyl(0.5, 0.3, 0.36, 0x5a4a50, { p: [0, 1.25, 0] }, 10);
      g.torus(0.5, 0.06, 0xff7a2a, { p: [0, 1.43, 0], r: [Math.PI / 2, 0, 0] }, 4, 14);
      return g.geometry();
    }, bx, y, bz);
    solidCyl(ev, bx, bz, 0.5, y, y + 1.5, 'feuerschale');
  }
  for (const [bx, bz] of ev.def.braziers ?? []) flame(ev, bx, y + 1.75, bz, 1.0);
  let next = 0;
  const lr = ev.def.lavaRing ?? 13;
  ev.updaters.push((dt, t) => {
    if (t < next) return;
    next = t + 0.4;
    const a = Math.random() * TAU, r = lr + Math.random() * 3;
    ev.level.effects?.sparks?.({ x: x + Math.cos(a) * r, y: 0.8, z: z + Math.sin(a) * r }, 3);
  });
}

// ------------------------------------------------------------------ 5-6 Torten-Insel mit Rot-Blau-Flipper

function cakeIsle(ev, x, y, z) {
  const tiers = [[4.0, 1.7], [3.0, 1.5], [2.0, 1.3]];
  let topY = 0;
  if (bake5(ev, 'deco_w5_torte', { size: 8, tiers: 3 }, [x, y, z], FRONT, 1, null, true, 12000)) topY = 4.5;
  else {
    addGeo(ev, 'w5m:bigcake', () => {
      const b = new Build();
      let yy = 0;
      const layerCols = [0x8a4a2a, 0xfff4e8, 0xf4cf8a, 0xe8406a, 0xf4cf8a];
      tiers.forEach(([r, h], k) => {
        // Seiten mit Schichten, Zuckerguss-Deckel mit Tropfen, Sahnetupfen am Rand
        b.add(new THREE.CylinderGeometry(r, r, h, 20, 1, true), { v: (px, py) => { const f = (py + h / 2) / h; return layerCols[Math.min(4, Math.floor(f * 5))]; } }, { p: [0, yy + h / 2, 0] });
        const icing = k % 2 ? 0xfff2f8 : 0xffaed6;
        b.cyl(r + 0.08, r + 0.08, 0.28, icing, { p: [0, yy + h - 0.12, 0] }, 20);
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + k, L = 0.25 + ((i * 7 + k) % 5) * 0.12;
          b.cyl(0.12, 0.12, L, icing, { p: [Math.cos(a) * (r + 0.06), yy + h - 0.26 - L / 2, Math.sin(a) * (r + 0.06)] }, 5, true);
          b.sphere(0.12, icing, { p: [Math.cos(a) * (r + 0.06), yy + h - 0.26 - L, Math.sin(a) * (r + 0.06)] }, 5, 2);
        }
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * TAU + 0.2 * k;
          b.lathe([[0.26, 0], [0.22, 0.12], [0.12, 0.26], [0, 0.34]], { v: (px, py) => mix(0xf6e6ee, 0xffffff, py * 3) }, { p: [Math.cos(a) * (r - 0.25), yy + h + 0.02, Math.sin(a) * (r - 0.25)], r: [0, i, 0] }, 6);
          if (i % 3 === 0) b.sphere(0.16, 0xe8203a, { p: [Math.cos(a) * (r - 0.25), yy + h + 0.42, Math.sin(a) * (r - 0.25)] }, 7, 5);
        }
        yy += h;
      });
      b.add(new THREE.CircleGeometry(tiers[2][0] + 0.08, 20).rotateX(-Math.PI / 2), 0xffaed6, { p: [0, yy + 0.02, 0] });
      // Kerzen (gestreift) – Flammen separat
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        b.cyl(0.1, 0.1, 0.8, (px, py) => (Math.floor((py + 0.4) * 6) % 2 ? 0xffffff : [0x4ac8ff, 0xffd23a, 0x7ae05a][i % 3]), { p: [Math.cos(a) * 1.2, yy + 0.4, Math.sin(a) * 1.2] }, 6);
      }
      b.sphere(0.5, { v: (px, py, pz, nx, ny) => mix(0xa8102a, 0xff3a5a, ny * 0.5 + 0.5) }, { p: [0, yy + 0.5, 0] }, 10, 7);
      b.tube([[0, yy + 0.95, 0], [0.1, yy + 1.3, 0], [0.35, yy + 1.55, 0]], 0.04, 0x4a8a2a, null, 6, 4);
      return b.geometry();
    }, x, y, z);
    topY = tiers.reduce((s, [, h]) => s + h, 0);
    flames(ev, Array.from({ length: 6 }, (_, i) => [x + Math.cos((i / 6) * TAU) * 1.2, y + topY + 0.82, z + Math.sin((i / 6) * TAU) * 1.2, 0.9]), 'kerzen');
  }
  solidCyl(ev, x, z, tiers[0][0] + 0.15, y, y + topY + 1, 'torte');
  // Deko rund um die Torte: Zuckerstangen, Cupcakes, Riesenkirschen (Registry-Kulisse, sonst eigene)
  for (const [dx, dz, kind, s] of [[-5.6, 1.2, 'cane', 2.4], [5.4, 0.8, 'cane', 2.0], [-5.2, -2.6, 'cup', 1.0], [5.6, -2.4, 'cherry', 0.9], [3.8, 3.4, 'cup', 0.8]]) {
    const px = x + dx, pz = z + dz;
    const ok = kind === 'cane' ? bake5(ev, 'deco_w5_zuckerstange', { height: s }, [px, y, pz], FRONT + dx, 1, null, true, 2000)
      : kind === 'cherry' ? bake5(ev, 'deco_w5_kirsche', { size: s * 0.75 }, [px, y, pz], FRONT, 1, null, true, 2000) : false;
    if (!ok) ev.addStatic(place(kind === 'cane' ? candyCaneGeo(s) : kind === 'cup' ? cupcakeGeo(s, dx < 0 ? 0xff9ac8 : 0xc8a0ff) : cherryGeo(s), px, y, pz, dx), { castShadow: true });
    solidCyl(ev, px, pz, kind === 'cup' ? 0.65 * s : 0.3, y, y + (kind === 'cane' ? s : 1.4 * s), 'suessigkeit');
  }
  // Rot-Blau-Flipper (def.flipper: [x, z, n, cell]): Felder im Schachbrett, die aktive Farbe steht fest (erhaben),
  // die andere ist nur ein durchscheinender Umriss; jeder Sprung der Heldin (level.onJump) wechselt die Farbe
  const fl = ev.def.flipper;
  if (!fl) return;
  const [fx, fz, n = 3, cell = 1.6] = fl;
  const spots = [[], []];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) spots[(i + j) % 2].push([fx + (i - (n - 1) / 2) * cell, fz + (j - (n - 1) / 2) * cell]);
  const tile = (col, light) => cached(`w5m:flip:${col}`, () => {
    const b = new Build();
    b.box(cell - 0.12, 0.22, cell - 0.12, { v: (px, py, pz, nx, ny) => mix(col, light, Math.max(0, ny) * 0.6 + 0.1) }, { p: [0, 0.11, 0] }, 0.06, 1);
    b.box(cell * 0.45, 0.03, cell * 0.45, light, { p: [0, 0.235, 0], r: [0, Math.PI / 4, 0] }, 0);
    return b.geometry();
  });
  const ghost = cached('w5m:flipghost', () => {
    const b = new Build();
    for (const s of [-1, 1]) { b.box(cell - 0.12, 0.04, 0.08, 0xffffff, { p: [0, 0.03, s * (cell / 2 - 0.1)] }, 0); b.box(0.08, 0.04, cell - 0.12, 0xffffff, { p: [s * (cell / 2 - 0.1), 0.03, 0] }, 0); }
    return b.geometry();
  });
  const solidMats = [vcol(0.35, { emissive: 0x3a0808 }, 'w5flipR'), vcol(0.35, { emissive: 0x08143a }, 'w5flipB')];
  const ghostMats = [0xff5a6a, 0x4a8aff].map((c) => glowMat(ev, c, { transparent: true, opacity: 0.6, depthWrite: false }));
  const geos = [tile(0xe8283a, 0xffb0b8), tile(0x2a6ae8, 0xb8d4ff)];
  const sets = spots.map((sp, s) => {
    const m = instanced(ev, geos[s], sp.length, { name: `flipper:${s ? 'blau' : 'rot'}`, material: solidMats[s], shadow: true });
    sp.forEach(([px, pz], i) => setInst(m, i, px, y, pz));
    m.instanceMatrix.needsUpdate = true;
    cullByView(ev, m, fx, y, fz, cell * n);
    return m;
  });
  const flipper = { color: 'rot', flips: 0, bump: 0 };
  ev.flipper = flipper;
  const apply = () => {
    sets.forEach((m, s) => {
      const on = (s === 0) === (flipper.color === 'rot');
      m.geometry = on ? geos[s] : ghost;
      m.material = on ? solidMats[s] : ghostMats[s];
      m.castShadow = on;
    });
  };
  apply();
  const off = ev.level.onJump?.((fig) => {
    if (fig !== ev.level.player) return;
    flipper.color = flipper.color === 'rot' ? 'blau' : 'rot';
    flipper.flips++;
    flipper.bump = 1;
    apply();
  });
  if (typeof off === 'function') ev.own.push({ dispose: off });
  ev.updaters.push((dt) => {
    if (flipper.bump <= 0) return;
    flipper.bump = Math.max(0, flipper.bump - dt * 4);
    sets.forEach((m, s) => {
      const on = (s === 0) === (flipper.color === 'rot');
      spots[s].forEach(([px, pz], i) => setInst(m, i, px, y + (on ? Math.sin(flipper.bump * Math.PI) * 0.12 : 0), pz, 0, [1, on ? 1 + flipper.bump * 0.3 : 1, 1]));
      m.instanceMatrix.needsUpdate = true;
    });
  });
  ev.liveInfo = () => ({ flipper: { color: flipper.color, flips: flipper.flips } });
}

// ------------------------------------------------------------------ 5-7 Schleich-Festung mit Suchscheinwerfer

export const SEARCH_STEPS = 8;    // Positionen je Runde (eine je Zählzeit)

function sneakFort(ev, x, y, z) {
  addGeo(ev, 'w5m:sneakfort', () => {
    const b = new Build();
    const stone = (px, py, pz, nx, ny) => (ny > 0.6 ? 0x5a5270 : ((Math.floor(py * 1.6) + Math.floor((px + pz) * 0.8)) & 1) ? 0x3a3448 : 0x463e56);
    b.box(14, 4.4, 2.4, stone, { p: [0, 2.2, 0] }, 0.08, 1);
    for (let i = 0; i < 13; i++) b.box(0.7, 0.7, 2.5, 0x2e2a3a, { p: [-6.5 + i * 1.08, 4.75, 0] }, 0, 1);
    for (const s of [-1, 1]) {
      b.cyl(1.6, 1.75, 7.2, stone, { p: [s * 7.2, 3.6, 0.2] }, 10);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.box(0.5, 0.6, 0.5, 0x2e2a3a, { p: [s * 7.2 + Math.cos(a) * 1.45, 7.5, 0.2 + Math.sin(a) * 1.45] }, 0, 1); }
    }
    b.cone(2.0, 2.6, { v: (px, py) => mix(0x1a1626, 0x3a2e5a, py / 2.6 + 0.5) }, { p: [7.2, 9.1, 0.2] }, 10);
    // Tor mit Fallgitter
    const door = new THREE.Shape();
    door.moveTo(-1.5, 0); door.lineTo(-1.5, 2.0); door.absarc(0, 2.0, 1.5, Math.PI, 0, true); door.lineTo(1.5, 0); door.lineTo(-1.5, 0);
    b.extrude(door, 0.16, 0x0e0a14, { p: [0, 0, 1.22] }, 0, 10);
    for (let i = -2; i <= 2; i++) b.box(0.1, 3.3, 0.1, 0x6a6a7a, { p: [i * 0.55, 1.65, 1.34] }, 0, 1);
    for (const yy of [0.9, 2.3]) b.box(2.9, 0.1, 0.1, 0x6a6a7a, { p: [0, yy, 1.34] }, 0, 1);
    // Fensterrahmen
    for (const px of [-4.2, 4.2]) b.box(0.9, 1.2, 0.1, 0x1e1a26, { p: [px, 2.6, 1.22] }, 0, 1);
    return b.geometry();
  }, x, y, z);
  solidBox(ev, x - 7, y, z - 1.2, x + 7, y + 5.2, z + 1.25, 'festung');
  for (const s of [-1, 1]) solidCyl(ev, x + s * 7.2, z + 0.2, 1.8, y, y + 8, 'festungsturm');
  // glühende Fenster (Lava-Schein), Suchkopf-Kanonen auf der Mauer
  const wm = glowMat(ev, 0xff8a2a);
  const win = new THREE.Mesh(cached('w5m:fortwin', () => {
    const b = new Build();
    for (const px of [-4.2, 4.2]) b.box(0.66, 0.96, 0.03, 0xffffff, { p: [px, 2.6, 1.29] }, 0);
    for (const s of [-1, 1]) b.box(0.4, 0.7, 0.03, 0xffffff, { p: [s * 7.2, 5.4, 1.96] }, 0);
    return b.geometry();
  }), wm);
  win.position.set(x, y, z);
  win.name = 'w5:festungsfenster';
  ev.view.add(win);
  for (const sx of [-3.2, 3.2]) bake5(ev, 'kanone_turm', {}, [x + sx, y + 4.4, z], FRONT, 0.8, null, true, 3000);
  // Suchscheinwerfer (def.lamp: [x, y, z] Lampe; def.sweep: [x, z, r] Kreis des Lichtflecks)
  const lp = ev.def.lamp ?? [x - 7.2, y + 9.4, z + 0.2];
  const [sx0, sz0, sr] = ev.def.sweep ?? [x, z + 9, 6];
  addGeo(ev, 'w5m:lampmast', () => {
    const b = new Build();
    b.cyl(0.18, 0.22, 2.4, 0x5a5a6a, { p: [0, 1.2, 0] }, 6);
    b.cyl(0.45, 0.5, 0.25, 0x3a3a48, { p: [0, 2.45, 0] }, 10);
    return b.geometry();
  }, lp[0], lp[1] - 2.6, lp[2]);
  const head = new THREE.Group();
  head.position.set(lp[0], lp[1], lp[2]);
  head.name = 'w5:suchscheinwerfer';
  ev.view.add(head);
  let alarm = 0, aim = { yaw: 0, pitch: -0.6 };
  const model = live5(ev, 'suchscheinwerfer', {}, [0, 0, 0], 0, 1.25, () => ({ alarm: alarm > 0.5 ? 1 : 0, seen: alarm > 0.05 && alarm <= 0.5 }), true, 6000, head);
  let lampMat = null;
  if (!model) {
    const lamp = new THREE.Mesh(cached('w5m:lamphead', () => {
      const b = new Build();
      b.cyl(0.55, 0.42, 1.0, 0x2e2e3a, { p: [0.2, 0, 0], r: [0, 0, Math.PI / 2] }, 12);
      b.torus(0.56, 0.07, 0xb8bcc8, { p: [0.72, 0, 0], r: [0, Math.PI / 2, 0] }, 4, 14);
      for (const s of [-1, 1]) b.box(0.08, 0.5, 0.08, 0x5a5a6a, { p: [0, -0.35, s * 0.6] }, 0);
      return b.geometry();
    }), vcol(0.4, {}, 'w5lamp'));
    lamp.castShadow = true;
    head.add(lamp);
    lampMat = glowMat(ev, 0xfff4c0);
    const lens = new THREE.Mesh(cached('w5m:lens', () => new THREE.CircleGeometry(0.5, 14).rotateY(Math.PI / 2)), lampMat);
    lens.position.x = 0.74;
    head.add(lens);
  }
  // Lichtkegel (additiv, Spitze an der Lampe) und Lichtfleck am Boden
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.24, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true });
  ev.own.push(coneMat);
  const coneGeo = cached('w5m:lightcone', () => { const g = new THREE.ConeGeometry(1, 1, 20, 1, true); g.translate(0, -0.5, 0); g.rotateX(-Math.PI / 2); return g; });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.renderOrder = 4;
  cone.name = 'w5:lichtkegel';
  ev.view.add(cone);
  const spotMat = new THREE.MeshBasicMaterial({ map: spotTexture(), color: 0xfff2b0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, fog: true });
  ev.own.push(spotMat);
  const spot = new THREE.Mesh(cached('w5m:spot', () => new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)), spotMat);
  spot.renderOrder = 3;
  spot.name = 'w5:lichtfleck';
  ev.view.add(spot);
  const bang = new THREE.Mesh(cached('w5m:bang', () => {
    const b = new Build();
    b.box(0.32, 1.0, 0.2, 0xff3a3a, { p: [0, 0.75, 0] }, 0.08, 1);
    b.sphere(0.2, 0xff3a3a, { p: [0, 0, 0] }, 8, 6);
    return b.geometry();
  }), glowMat(ev, 0xffffff, { vertexColors: true }));
  bang.position.set(lp[0], lp[1] + 1.4, lp[2]);
  bang.visible = false;
  bang.name = 'w5:alarm';
  ev.view.add(bang);
  const SPOT_R = 2.2;
  const target = new THREE.Vector3(), dir = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1);
  const state = { beat: 0, step: 0, angle: 0, source: 'zeit', theme: null, alarm: false, spot: [sx0, sz0] };
  const searchlight = {
    /** Zustand aus der Taktuhr: Position (Schritt je Zählzeit, weich in der ersten Hälfte), Winkel, Lichtfleck. */
    info(t = ev.view.time) {
      const bt = beatNow(t);
      const whole = Math.floor(bt.beat), frac = bt.beat - whole;
      const e = Math.min(1, frac / 0.45);
      const k = e * e * (3 - 2 * e);
      const angle = ((whole + k) / SEARCH_STEPS) * TAU;
      return { beat: +bt.beat.toFixed(3), step: whole % SEARCH_STEPS, moving: frac < 0.45, angle: +(angle % TAU).toFixed(4), source: bt.source, theme: bt.theme, bpm: bt.bpm,
        spot: [+(sx0 + Math.cos(angle) * sr).toFixed(3), +(sz0 + Math.sin(angle) * sr * 0.7).toFixed(3)] };
    },
    shown: null,
  };
  ev.searchlight = searchlight;
  ev.liveInfo = () => ({ searchlight: { ...searchlight.info(), alarm: state.alarm, shown: searchlight.shown } });
  const aimLight = (dt, t) => {
    const st = searchlight.info(t);
    const [tx, tz] = st.spot;
    const gy = y + 0.075;   // über den Wegplatten (0,06 m)
    target.set(tx, gy, tz);
    // Heldin im Lichtfleck → Alarm (rot)
    const p = ev.level.player;
    const inside = !!p && !p.dead && Math.hypot(p.pos.x - tx, p.pos.z - tz) < SPOT_R && Math.abs(p.pos.y - y) < 2.5;
    alarm = inside ? 1 : Math.max(0, alarm - dt * 1.5);
    state.alarm = inside;
    const col = alarm > 0.5 ? 0xff4a4a : 0xfff2b0;
    coneMat.color.setHex(col); spotMat.color.setHex(col);
    if (lampMat) lampMat.color.setHex(alarm > 0.5 ? (Math.floor(t * 8) % 2 ? 0xff3a3a : 0xffd0d0) : 0xfff4c0);
    bang.visible = alarm > 0.5;
    bang.position.y = lp[1] + 1.4 + Math.abs(Math.sin(t * 8)) * 0.2;
    // Kegel: von der Lampe zum Fleck
    dir.set(tx - lp[0], gy - lp[1], tz - lp[2]);
    const len = dir.length();
    cone.position.set(lp[0], lp[1], lp[2]);
    cone.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    cone.scale.set(SPOT_R * 0.9, SPOT_R * 0.9, len);
    spot.position.copy(target);
    spot.scale.set(SPOT_R, 1, SPOT_R);
    aim.yaw = Math.atan2(-(tz - lp[2]), tx - lp[0]);
    aim.pitch = Math.atan2(gy - lp[1], Math.hypot(tx - lp[0], tz - lp[2]));
    head.rotation.set(0, aim.yaw, aim.pitch, 'YXZ');
    wm.color.setHex(Math.sin(t * 4.1) + Math.sin(t * 1.7) > 1.3 ? 0xffc04a : 0xff7a1a);
    searchlight.shown = { step: st.step, spot: st.spot };
  };
  aimLight(0, 0);
  ev.updaters.push(aimLight);
}

let spotTex = null;
function spotTexture() {
  if (spotTex) return spotTex;
  spotTex = canvasTexture('w5:spot', 64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.7, 'rgba(255,255,255,0.75)'); g.addColorStop(0.88, 'rgba(255,255,255,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  });
  return spotTex;
}

// ------------------------------------------------------------------ 5-Zug Goldzug-Bahnhof

function goldStation(ev, x, y, z) {
  const rl = ev.def.rail ?? { z: z - 1, x0: x - 16, x1: x + 16 };
  const RZ = rl.z;
  // Gleis über die ganze Insel
  addGeo(ev, `w5m:goldrail:${rl.x1 - rl.x0}`, () => {
    const b = new Build();
    const L = rl.x1 - rl.x0;
    for (let i = 0; i < Math.round(L / 0.9); i++) b.box(0.3, 0.1, 2.4, 0x6a4628, { p: [-L / 2 + 0.45 + i * 0.9, 0.05, 0] }, 0);
    for (const s of [-1, 1]) b.box(L, 0.12, 0.09, 0xb8bcc8, { p: [0, 0.16, s * 0.6] }, 0);
    for (const s of [-1, 1]) { b.box(0.3, 0.7, 2.4, 0xe8283a, { p: [s * (L / 2 - 0.2), 0.45, 0] }, 0.04, 1); b.box(0.32, 0.12, 2.42, 0xffffff, { p: [s * (L / 2 - 0.2), 0.6, 0] }, 0, 1); }
    return b.geometry();
  }, (rl.x0 + rl.x1) / 2, y, RZ, 0, false);
  for (const s of [-1, 1]) solidBox(ev, (s < 0 ? rl.x0 : rl.x1) - 0.4, y, RZ - 1.2, (s < 0 ? rl.x0 : rl.x1) + 0.4, y + 0.7, RZ + 1.2, 'prellbock');
  // Bahnsteig mit Dach hinter dem Gleis (der Zug steht davor, zur Kamera hin), Bahnhofshäuschen mit Uhr am Ostende
  addGeo(ev, 'w5m:platform', () => {
    const b = new Build();
    b.box(14, 0.4, 3.2, { v: (px, py, pz, nx, ny) => (ny > 0.5 ? 0xd8c8dc : 0x9a8aa8) }, { p: [0, 0.2, 0] }, 0.04, 1);
    b.box(14, 0.05, 0.3, 0xffd23a, { p: [0, 0.42, 1.45] }, 0);
    for (const px of [-5.5, 0, 5.5]) b.cyl(0.12, 0.14, 3.4, 0xffc21a, { p: [px, 2.1, -0.6] }, 8);
    b.box(15, 0.25, 4.2, (px, py, pz, nx, ny) => (ny > 0.5 ? (Math.floor(px + 20) % 2 ? 0x9a4ad8 : 0xfff6ff) : 0x7a3ab8), { p: [0, 3.85, -0.1], r: [-0.08, 0, 0] }, 0.05, 1);
    for (let i = 0; i < 15; i++) b.cone(0.3, 0.4, i % 2 ? 0xffc21a : 0x9a4ad8, { p: [-7 + i, 3.55, 2.0], r: [Math.PI, 0, 0], s: [1, 1, 0.3] }, 3);
    // Häuschen (lila, goldenes Dach, Uhr) am Ostende, Front zur Kamera
    b.box(3.6, 2.8, 2.6, { v: (px, py, pz, nx) => mix(0x8a4ac8, 0xb47ae0, py / 2.8 + 0.3) }, { p: [9.6, 1.4, -0.6] }, 0.06, 1);
    b.cone(2.9, 1.4, 0xffc21a, { p: [9.6, 3.5, -0.6], r: [0, Math.PI / 4, 0], s: [1, 1, 0.75] }, 4);
    b.cyl(0.55, 0.55, 0.12, 0xfff8e8, { p: [9.6, 1.9, 0.75], r: [Math.PI / 2, 0, 0] }, 16);
    b.torus(0.58, 0.07, 0xffc21a, { p: [9.6, 1.9, 0.8] }, 4, 16);
    const door = new THREE.Shape();
    door.moveTo(-0.45, 0); door.lineTo(-0.45, 0.9); door.absarc(0, 0.9, 0.45, Math.PI, 0, true); door.lineTo(0.45, 0); door.lineTo(-0.45, 0);
    b.extrude(door, 0.1, 0x3a1a4a, { p: [8.4, 0, 0.72] }, 0, 6);
    return b.geometry();
  }, x, y, RZ - 2.9);
  solidBox(ev, x - 7, y, RZ - 4.5, x + 7, y + 0.4, RZ - 1.3, 'bahnsteig');
  solidBox(ev, x + 7.8, y, RZ - 4.8, x + 11.4, y + 4.2, RZ - 2.2, 'bahnhaus');
  for (const px of [-5.5, 0, 5.5]) solidCyl(ev, x + px, RZ - 3.5, 0.18, y, y + 3.8, 'saeule');
  // Uhrzeiger (dreht sich)
  const hand = new THREE.Mesh(cached('w5m:stationhand', () => { const b = new Build(); b.box(0.06, 0.42, 0.03, 0x2a1a4a, { p: [0, 0.18, 0] }, 0); b.box(0.05, 0.3, 0.03, 0xe8283a, { p: [0, 0.12, 0.02] }, 0); return b.geometry(); }), vcol(0.4, {}, 'w5hand'));
  hand.position.set(x + 9.6, y + 1.9, RZ - 2.9 + 0.83);
  hand.name = 'w5:bahnhofsuhr';
  ev.view.add(hand);
  // goldener Zug: Lok + zwei Münzwagen (Ursprung Gleismitte), Fahrtrichtung −X
  const tx = rl.train ?? x - 1;
  addGeo(ev, 'w5m:goldtrain', () => {
    const b = new Build();
    const gold = { v: (px, py, pz, nx, ny) => mix(0xd08a00, 0xffd23a, Math.max(0, ny) * 0.6 + 0.25 + Math.abs(nz5(nx, ny)) * 0.1) };
    // Lok (vorn bei −X)
    b.box(5.4, 0.5, 2.2, 0x3a2a4a, { p: [-6, 0.6, 0] }, 0.05, 1);
    b.cyl(0.95, 0.95, 3.4, gold, { p: [-7.0, 1.75, 0], r: [0, 0, Math.PI / 2] }, 14);
    for (const px of [-8.2, -7.0, -5.8]) b.torus(0.98, 0.07, 0xe8283a, { p: [px, 1.75, 0], r: [0, Math.PI / 2, 0] }, 4, 16);
    b.cyl(0.32, 0.45, 1.2, 0x2a2a34, { p: [-8.0, 3.1, 0] }, 10);
    b.cyl(0.55, 0.32, 0.3, 0x2a2a34, { p: [-8.0, 3.75, 0] }, 10);
    b.sphere(0.4, gold, { p: [-6.8, 2.75, 0] }, 9, 6);
    b.box(1.8, 2.2, 2.2, { v: (px, py) => mix(0x8a2ad0, 0xb46ae8, py / 2.2 + 0.4) }, { p: [-4.2, 2.0, 0] }, 0.08, 1);
    b.box(2.1, 0.22, 2.5, 0xffc21a, { p: [-4.2, 3.2, 0] }, 0.04, 1);
    for (const s of [-1, 1]) b.box(0.9, 0.7, 0.05, 0xffe680, { p: [-4.2, 2.3, s * 1.11] }, 0, 1);
    b.cone(0.7, 0.9, 0xe8283a, { p: [-9.0, 0.7, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 1.4] }, 4);
    b.sphere(0.22, 0xfff2b0, { p: [-8.7, 2.3, 0] }, 8, 6);
    // Münzwagen
    for (const wx of [-0.6, 4.6]) {
      b.box(4.4, 0.4, 2.2, 0x3a2a4a, { p: [wx, 0.55, 0] }, 0.05, 1);
      b.box(4.2, 1.1, 2.1, { v: (px, py, pz, nx, ny) => (Math.abs(ny) > 0.5 ? 0x7a3ab8 : mix(0x9a4ad8, 0xc89af0, py + 0.5)) }, { p: [wx, 1.3, 0] }, 0.06, 1);
      b.box(4.3, 0.12, 2.2, 0xffc21a, { p: [wx, 1.88, 0] }, 0, 1);
      for (let i = 0; i < 9; i++) b.sphere(0.6 + (i % 3) * 0.1, gold, { p: [wx - 1.6 + (i % 5) * 0.8, 1.95 + (i % 2) * 0.12, (i % 3 - 1) * 0.55], s: [1, 0.45, 1] }, 8, 4);
      for (let i = 0; i < 6; i++) b.cyl(0.24, 0.24, 0.08, 0xffd23a, { p: [wx - 1.4 + i * 0.55, 2.35 + (i % 2) * 0.12, (i % 2 ? 0.3 : -0.3)], r: [0.5 + i * 0.3, 0, 0.4] }, 10);
    }
    // Räder
    for (const px of [-8.0, -6.6, -5.2, -4.0, -2.0, 0.8, 3.2, 6.0]) for (const s of [-1, 1]) b.cyl(px > -5 && px < -3.8 ? 0.5 : 0.42, px > -5 && px < -3.8 ? 0.5 : 0.42, 0.14, 0xe8283a, { p: [px, px > -5 && px < -3.8 ? 0.5 : 0.42, s * 1.0], r: [Math.PI / 2, 0, 0] }, 12);
    return b.geometry();
  }, tx, y + 0.2, RZ);
  solidBox(ev, tx - 9.5, y, RZ - 1.2, tx + 7, y + 3.6, RZ + 1.2, 'goldzug');
  // Dampf aus dem Schornstein, funkelnde Münzen
  const steam = puffs(ev, 12, 0xffffff, 'dampf', { opacity: 0.9, at: [tx - 8.0, y + 4.2, RZ] });
  const N = 8;
  const twinkle = instanced(ev, cached('w5m:twinkle', () => {
    const b = new Build();
    b.extrude(starShape(0.28, 0.08, 4), 0.02, 0xffffff, {}, 0, 1);
    return b.geometry();
  }), N, { name: 'muenzfunkeln', material: glowMat(ev, 0xfff6b0, { transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide }) });
  const spots = Array.from({ length: N }, (_, i) => [tx + (i < 4 ? -0.6 : 4.6) - 1.6 + ((i * 1.3) % 3.2), y + 2.6 + (i % 2) * 0.2, RZ + ((i % 3) - 1) * 0.6]);
  let next = 0;
  const sparkle = (t) => {
    for (let i = 0; i < N; i++) {
      const k = Math.max(0, Math.sin(t * 2.2 + i * 1.9)) ** 4;
      const [px, py, pz] = spots[i];
      setInst(twinkle, i, px, py, pz + 1.15, 0, Math.max(0.05, k * 1.2), 0, t * 2 + i);
    }
    twinkle.instanceMatrix.needsUpdate = true;
  };
  sparkle(0.3);
  ev.updaters.push((dt, t) => {
    if (t > next) { next = t + 0.45; steam.emit(tx - 8.0, y + 4.2, RZ, 1, { vy: 1.6, vx: 0.5, life: 1.8, size: 0.9, spread: 0.2 }); }
    hand.rotation.z = -t * 0.6;
    sparkle(t);
  });
  cullByView(ev, twinkle, tx + 2, y + 2.6, RZ, 6);
}
const nz5 = (nx, ny) => (Math.abs(nx) < 0.5 && Math.abs(ny) < 0.5 ? 1 : 0);

// ------------------------------------------------------------------ 5-Burg Ruinen-Tempel mit Kippquader-König

function kippTemple(ev, x, y, z) {
  const tiers = [[18, 12, 1.4], [14.5, 9.5, 1.4], [11, 7.2, 1.4]];
  addGeo(ev, 'w5m:pyramid', () => {
    const b = new Build();
    let yy = 0;
    tiers.forEach(([w, d, h], k) => {
      b.box(w, h, d, (px, py, pz, nx, ny) => (ny > 0.6 ? (k === 2 ? 0xf2e2c2 : 0xe8d4ae) : ((Math.floor((py + yy) * 1.4) + Math.floor((px + pz) * 0.7)) & 1) ? 0xd8c098 : 0xc8ac80), { p: [0, yy + h / 2, -(12 - d) / 2] }, 0.04, 1);
      // Moos und Ranken
      for (let i = 0; i < 4; i++) b.sphere(0.4 + (i % 2) * 0.2, 0x7aa852, { p: [-w / 2 + 1 + i * (w - 2) / 3, yy + h - 0.05, d / 2 - (12 - d) / 2 - 0.2], s: [1.6, 0.3, 0.6] }, 7, 3);
      yy += h;
    });
    // Treppe vorn
    for (let i = 0; i < 8; i++) b.box(3.0, 0.52, 0.8, 0xf0dcb8, { p: [0, 0.26 + i * 0.52, 6.0 - i * 0.62 + 0.4] }, 0.02, 1);
    // goldene Ecken
    for (const s of [-1, 1]) b.cone(0.4, 0.9, 0xffc21a, { p: [s * 5.2, yy + 0.45, -(12 - tiers[2][1]) / 2 + tiers[2][1] / 2 - 0.4] }, 4);
    return b.geometry();
  }, x, y, z);
  // Kollision: Stufen (begehbar), Treppe als Stufen-Quader
  let yy = 0;
  tiers.forEach(([w, d, h]) => { solidBox(ev, x - w / 2, y, z - 6, x + w / 2, y + yy + h, z - 6 + d, 'pyramide'); yy += h; });
  for (let i = 0; i < 8; i++) solidBox(ev, x - 1.5, y, z + 6.0 - i * 0.62, x + 1.5, y + 0.52 * (i + 1), z + 6.8 - i * 0.62, 'treppe');
  const topY = y + yy;
  // Steinköpfe neben der Treppe, Fackeln
  for (const s of [-1, 1]) {
    const sk = pick5(['deco_w5_steinkopf', { size: 2.2 }, 6000], ['steinkopf', { size: 1.1 }, 6000]);
    if (!sk || !bake5(ev, sk[0], sk[1], [x + s * 3.4, y, z + 6.6], FRONT - s * 0.25, 1, { glow: 0.8 }, true, 6000)) ev.addStatic(place(stoneHeadGeo(1.1), x + s * 3.4, y, z + 6.6), { castShadow: true });
    solidBox(ev, x + s * 3.4 - 1, y, z + 5.8, x + s * 3.4 + 1, y + 2.3, z + 7.4, 'steinkopf');
    addGeo(ev, 'w5m:templetorch', () => { const b = new Build(); b.cyl(0.12, 0.16, 1.8, 0x6a4a2a, { p: [0, 0.9, 0] }, 6); b.cyl(0.28, 0.18, 0.3, 0x4a3a2a, { p: [0, 1.9, 0] }, 8); return b.geometry(); }, x + s * 5.4, y, z + 7.4);
    solidCyl(ev, x + s * 5.4, z + 7.4, 0.25, y, y + 2, 'fackel');
  }
  for (const s of [-1, 1]) flame(ev, x + s * 5.4, y + 2.35, z + 7.4, 0.8);
  // Dschungel-Bäumchen hinter der Pyramide
  for (const [dx, dz, h] of [[-9.5, -4, 5], [9.8, -3.6, 5.4], [-7.6, -7.4, 4.6], [8.2, -7.8, 4.8]]) ev.addStatic(place(jungleTreeGeo(h, Math.round(dx * 3)), x + dx, y, z + dz), { castShadow: true });
  // Kippquader-König auf der obersten Stufe: kippt abwechselnd links/rechts über die untere Kante, bleibt kurz liegen,
  // kippt zurück. Vor dem Kippen zeigt ein roter Boden-Hinweis, wo er landet; beim Aufschlag Staub.
  const S = [2, 4, 2];   // Breite, Höhe, Tiefe
  const kz = z - 6 + tiers[2][1] / 2;   // Mitte der obersten Stufe (alle Stufen schließen hinten bei z − 6 ab)
  const kx = x;
  const hinge = new THREE.Group();
  hinge.name = 'w5:kippquader';
  ev.view.add(hinge);
  const body = new THREE.Group();
  hinge.add(body);
  const kq = live5(ev, 'kippquader', { size: S, style: 'tempel' }, [0, 0, 0], Math.PI, 1,
    () => ({ anim: kipp.phase === 'warn' ? 'warn' : kipp.phase === 'tip' ? 'tip' : kipp.phase === 'down' ? 'land' : 'idle', k: kipp.k }), true, 7000, body);
  if (kq) {
    kq.root.position.y = S[1] / 2;   // Modell: Ursprung Körpermitte
    // Krone des Königs obenauf (eigene Geometrie, kippt mit)
    const crown = new THREE.Mesh(cached('w5m:kippcrown', () => {
      const b = new Build();
      b.cyl(0.8, 0.86, 0.34, { v: (px, py, pz, nx, ny) => mix(0xd89a10, 0xffe070, ny * 0.4 + 0.5) }, { p: [0, 0.17, 0] }, 10);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; b.cone(0.17, 0.48, 0xffd23a, { p: [Math.cos(a) * 0.68, 0.56, Math.sin(a) * 0.68] }, 4); b.sphere(0.07, 0xfff4b0, { p: [Math.cos(a) * 0.68, 0.84, Math.sin(a) * 0.68] }, 5, 3); }
      for (const [a, c] of [[Math.PI / 2, 0xe8283a], [Math.PI / 2 + 0.8, 0x3a8aff], [Math.PI / 2 - 0.8, 0x3ac85a]]) b.sphere(0.1, c, { p: [Math.cos(a) * 0.84, 0.18, Math.sin(a) * 0.84] }, 6, 4);
      return b.geometry();
    }), vcol(0.35, { metalness: 0.25 }, 'w5crown'));
    crown.position.y = S[1];
    crown.castShadow = true;
    body.add(crown);
  } else {
    const mesh = new THREE.Mesh(cached('w5m:kippking', () => {
      const b = new Build();
      b.box(S[0], S[1], S[2], { v: (px, py, pz, nx, ny) => mix(0x9a8a6a, 0xd8c8a0, ny * 0.3 + 0.5 + Math.sin(py * 5) * 0.05) }, { p: [0, S[1] / 2, 0] }, 0.1, 1);
      // Gesicht vorn (+Z): grimmige Augen, Brauen, Mund
      for (const s of [-1, 1]) {
        b.box(0.5, 0.36, 0.08, 0xffffff, { p: [s * 0.45, 2.7, 1.02] }, 0.04, 1);
        b.box(0.2, 0.22, 0.06, 0x1a1012, { p: [s * 0.4, 2.66, 1.07] }, 0, 1);
        b.box(0.6, 0.14, 0.12, 0x5a4a3a, { p: [s * 0.45, 3.02, 1.04], r: [0, 0, s * 0.35] }, 0, 1);
      }
      b.box(1.2, 0.3, 0.1, 0x3a2a22, { p: [0, 1.9, 1.04] }, 0.04, 1);
      for (let i = 0; i < 4; i++) b.box(0.16, 0.14, 0.06, 0xffffff, { p: [-0.42 + i * 0.28, 1.98, 1.09] }, 0, 1);
      // Krone
      b.cyl(0.85, 0.9, 0.35, 0xffc21a, { p: [0, S[1] + 0.17, 0] }, 8);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.cone(0.18, 0.5, 0xffd23a, { p: [Math.cos(a) * 0.7, S[1] + 0.55, Math.sin(a) * 0.7] }, 4); }
      b.sphere(0.14, 0xe8283a, { p: [0, S[1] + 0.3, 0.88] }, 6, 4);
      return b.geometry();
    }), vcol(0.45, {}, 'w5kipp'));
    mesh.castShadow = true;
    body.add(mesh);
  }
  // roter Landeboden-Hinweis (zwei Seiten), Staubwolken
  const hintMat = glowMat(ev, 0xff3a3a, { transparent: true, opacity: 0, depthWrite: false });
  const hint = new THREE.Mesh(cached('w5m:kipphint', () => new THREE.PlaneGeometry(S[1], S[2] + 0.2).rotateX(-Math.PI / 2)), hintMat);
  hint.renderOrder = 2;
  hint.name = 'w5:landehinweis';
  hint.position.set(kx + S[0] / 2 + S[1] / 2, topY + 0.04, kz);
  ev.view.add(hint);
  const dust = puffs(ev, 14, 0xe8d8b8, 'staub', { at: [kx, topY + 0.5, kz] });
  const kipp = { phase: 'idle', side: 1, k: 0, t: 0, lying: false, tips: 0 };
  // Ablauf: idle 1,6 s → warn 0,7 s → tip 0,55 s → liegt 1,2 s → aufrichten 0,8 s → Seite wechseln
  const PH = { idle: 1.6, warn: 0.7, tip: 0.55, down: 1.2, up: 0.8 };
  const setPose = (ang, wob = 0) => {
    // Drehpunkt: untere Kante auf der Kippseite
    hinge.position.set(kx + kipp.side * S[0] / 2, topY, kz);
    body.position.set(-kipp.side * S[0] / 2, 0, 0);
    hinge.rotation.set(0, 0, -kipp.side * ang + wob);
  };
  setPose(0);
  ev.updaters.push((dt, t) => {
    kipp.t += dt;
    const ph = kipp.phase;
    if (ph === 'idle') { setPose(0, Math.sin(t * 2) * 0.01); if (kipp.t > PH.idle) { kipp.phase = 'warn'; kipp.t = 0; } }
    else if (ph === 'warn') {
      setPose(0, Math.sin(kipp.t * 30) * 0.03 * kipp.side);
      hint.position.set(kx + kipp.side * (S[0] / 2 + S[1] / 2), topY + 0.04, kz);
      hintMat.opacity = 0.35 + 0.3 * Math.abs(Math.sin(kipp.t * 12));
      if (kipp.t > PH.warn) { kipp.phase = 'tip'; kipp.t = 0; }
    } else if (ph === 'tip') {
      const u = Math.min(1, kipp.t / PH.tip);
      kipp.k = u;
      setPose((u * u) * Math.PI / 2);
      if (u >= 1) {
        kipp.phase = 'down'; kipp.t = 0; kipp.tips++; hintMat.opacity = 0;
        for (let i = 0; i < 6; i++) dust.emit(kx + kipp.side * (S[0] / 2 + i * 0.7), topY + 0.2, kz + (i % 2 ? 1 : -1), 1, { vy: 1.2, life: 1.2, size: 1.0, spread: 0.5 });
        ev.level.effects?.sparks?.({ x: kx + kipp.side * 3, y: topY + 0.3, z: kz }, 4);
      }
    } else if (ph === 'down') { setPose(Math.PI / 2); if (kipp.t > PH.down) { kipp.phase = 'up'; kipp.t = 0; } }
    else if (ph === 'up') {
      const u = Math.min(1, kipp.t / PH.up), e = u * u * (3 - 2 * u);
      setPose((1 - e) * Math.PI / 2);
      if (u >= 1) { kipp.phase = 'idle'; kipp.t = 0; kipp.k = 0; kipp.side = -kipp.side; }
    }
  });
  solidBox(ev, kx - S[0] / 2 - S[1], topY, kz - S[2] / 2, kx + S[0] / 2 + S[1], topY + S[1] + 0.8, kz + S[2] / 2, 'kippquader');
  ev.liveInfo = () => ({ kippquader: { phase: kipp.phase, side: kipp.side, tips: kipp.tips } });
}
void violetRockGeo;
