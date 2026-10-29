// Kulissen der Welt-8-Eingänge (Kurs-Karte „Brummbär-Rummelplatz“, eigene Gestaltung), aufgerufen aus
// EntranceView.decorate(). In Klammern die Registry-Modelle (models/kinds/*_w8.js und vorhandene), die benutzt werden,
// sobald es sie gibt – mit Dreiecks-Obergrenze; sonst eigene sparsame Geometrie an gleicher Stelle:
//   rainfort       8-1        Regenfestung auf nassem Fels im Meer: Mauern und Wachtürme ('regenfestung' mauer/turm/pfuetze),
//                             eigene kleine Regenwolke mit Regenschleiern, zwei Stachelbrücken zum Ufer – ihre Stacheln
//                             fahren im Takt der Kartenmusik abwechselnd aus
//   dunes8         8-2        Dünen mit Baron-Sandstatue ('baron_sandstatue'), Pilzling-Sandskulptur ('sandskulptur_pilzling'),
//                             Sanddünen ('duene'), Schubfeld ('schubfeld'); die Segelflosse eines Sandflossers kreist im Sand
//   cookiefactory  8-3        Keks-Fabrik: Halle mit Schokodach, Zuckerguss-Nasen, Keks-Wappen und drei Ringel-Schornsteinen
//                             (Rauch aus den Weltdaten), Keksturm ('keksfabrik' keksturm), Fließband mit fahrenden Keksen
//                             ('keksfabrik' band), drehendes Keksrad und Keks-Zahnrad ('keksrad', 'keks_zahnrad')
//   baronstation   8-Zug      Bahnhof: Bahnsteigdach mit Uhr, Signal; der Baron-Express (Lok mit Bärengesicht und
//                             Zylinder-Schornstein, zwei Wagen) rangiert vor und zurück, Dampfwölkchen
//   nightfort      8-4        Nacht-Festung: dunkelblaue Mauern und Rundtürme mit blau glimmenden Fenstern; blau glimmende
//                             Stege ('leuchtsteg', Instanzen) leuchten als Welle nacheinander auf
//   lakefort       8-5        Unterwasser-Festung im See: versunkene Türme mit blauen Dächern, gebrochene Säulen, Gitterwand,
//                             Algen ('wasserfestung'), Luftblasen steigen; ein schwebender Wasserwürfel ('wasserkoerper')
//   clawhouse      8-Haus     Prüfungs-Haus: schmales hohes Haus mit Krallen-Kratzspuren und Kletterhaken, darüber dreht sich
//                             ein Krallen-Anzug ('powerup_krallen')
//   darkmansion    8-6        Spukhaus: dunkles Herrenhaus mit Türmchen und flackernden Fenstern, großer Spukspiegel
//                             ('spukspiegel', Spiegelbild-Stern), Licht-Helm auf einem Sockel ('helm_licht'), kleine Spuk-Geister
//   inferno        8-7        Lava-Inferno: Kristall-Felsklotz ('kristall_felsklotz') rollt im Lavabecken hin und her, ein
//                             zweiter (Würfel) wartet am Rand; Kristalle und Fontänen aus den Weltdaten
//   goldtent       8-A        Zirkuszelt ('zirkuszelt') mit goldener Würfelblase ('wuerfelblase' gold) und Sternen-Wimpeln
//   snaketent      8-B        Zirkuszelt mit rosa Schlangenkönig, der aus seinem Korb schaut und sich wiegt (eigene sparsame
//                             Figur – 'schlangenkoenig' rosa ist für die Karte zu schwer), Lavapfützen ('lavapfuetze')
//   barontower     8-Burg     der riesige Baron-Turm ('baron_turm' ganz) mit Brummbär-Büste; oben das leise leuchtende Glas der
//                             gefangenen Freunde; Autowrack ('autowrack'). Nach dem Spielende (courseSave.data.finished): Glas
//                             offen und leer, die Freunde (Krümel, Flocke, Hoppel, Fernglas-Kobold) hüpfen winkend vor dem Turm
// Benutzte Modelle meldet state().decor.w8models, zu schwere w8heavy (Name → Dreiecke).
// Große, unbewegte Teile gehen in die verschmolzene statische Geometrie (Registry-Modelle je Eingang in eine kompakte
// Kachel 'w8:<Id>' mit Fern-Ausblendung – außer dem Turm, der von überall zu sehen sein soll), bewegte sind eigene Objekte
// (ev.updaters), gleichartige als Instanzen. Bewegte Objekte stehen schon beim Bau an ihrer Startlage (lod.js).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mix, TAU, cached, vcol, glowTexture } from '../models/lib/kit.js';
import { getModel, hasModel } from '../models/index.js';
import { createInstanced } from '../models/lib/instanced.js';
import { friendGeo } from '../models/lib/w8Geos.js';
import { bakeModel } from './bake.js';
import { LowBuild as Build, place } from './desert.js';
import { modelTris } from './beach5.js';
import { beatNow8, beatPulse, W8_USED, W8_HEAVY, gameFinished } from './rummel8.js';

/** Kulisse für eine Welt-8-Art bauen; false = unbekannte Art. */
export function decorateW8(ev, kind, x, y, z) {
  switch (kind) {
    case 'rainfort': rainFort(ev, x, y, z); return true;
    case 'dunes8': dunes(ev, x, y, z); return true;
    case 'cookiefactory': cookieFactory(ev, x, y, z); return true;
    case 'baronstation': baronStation(ev, x, y, z); return true;
    case 'nightfort': nightFort(ev, x, y, z); return true;
    case 'lakefort': lakeFort(ev, x, y, z); return true;
    case 'clawhouse': clawHouse(ev, x, y, z); return true;
    case 'darkmansion': darkMansion(ev, x, y, z); return true;
    case 'inferno': inferno(ev, x, y, z); return true;
    case 'goldtent': goldTent(ev, x, y, z); return true;
    case 'snaketent': snakeTent(ev, x, y, z); return true;
    case 'barontower': baronTower(ev, x, y, z); return true;
    default: return false;
  }
}

// ------------------------------------------------------------------ Helfer

const solidBox = (ev, x0, y0, z0, x1, y1, z1, tag = 'deko') => ev.level.world.add({ type: 'box', min: [x0, y0, z0], max: [x1, y1, z1], tag });
const solidCyl = (ev, x, z, r, y0, y1, tag = 'deko') => ev.level.world.add({ type: 'cyl', x, z, r, y0, y1, tag });
const glowMat = (ev, color, extra = {}) => { const m = new THREE.MeshBasicMaterial({ color, fog: true, ...extra }); ev.own.push(m); return m; };
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
// Registry-Modelle blicken nach +X, die Kulissen nach +Z (Kamera): yaw −π/2 dreht +X nach +Z
const FRONT = -Math.PI / 2;
const tooHeavy = (name, opts, max) => { const n = modelTris(name, opts); if (n > max) { W8_HEAVY.set(name, Number.isFinite(n) ? Math.round(n) : -1); return true; } return false; };

/**
 * Registry-Modell als statische Kulisse einbacken (false, solange es fehlt oder zu schwer ist); Kachel 'w8:<Id>' (lod),
 * tile = Name (feste Kachel ohne Fern-Ausblendung) oder { name, lod: true } (eigene Kachel mit Fern-Ausblendung).
 */
function bake8(ev, name, opts, pos, yaw = FRONT, scale = 1, state = null, cast = true, maxTris = 6000, tileOpt = null) {
  if (!hasModel(name) || tooHeavy(name, opts, maxTris)) return false;
  const tile = tileOpt && typeof tileOpt === 'object' ? tileOpt.name : tileOpt;
  const lod = tileOpt === null || !!tileOpt?.lod;
  // Leuchtteile in die gemeinsame Leucht-Kachel, Teile ohne Schatten (Decals, Pfützen …) in die schattenlose
  // Zonen-Kachel – keine eigenen kleinen Kacheln (Zeichenaufrufe) je Eingang
  const add = (g, o) => (o?.material === 'glow' ? ev.addStatic(g, { ...o, castShadow: false, tile: 'w8:leuchten' })
    : cast && o?.castShadow !== false ? ev.addStatic(g, { ...o, tile: tile ?? `w8:${ev.id}`, lod })
      : ev.addStatic(g, { ...o, castShadow: false, ...(tile ? { tile } : {}) }));
  const ok = !!bakeModel(add, name, opts, pos, yaw, scale, state);
  if (ok) W8_USED.add(name);
  return ok;
}
/** Registry-Modell als bewegtes Objekt; state = Objekt/String oder Funktion (dt, t) → state. null, wenn es fehlt. */
function live8(ev, name, opts, pos, yaw = FRONT, scale = 1, state = 'idle', shadow = true, maxTris = 6000, far = 45) {
  if (!hasModel(name) || tooHeavy(name, opts, maxTris)) return null;
  const m = getModel(name, opts ?? {});
  if (m.placeholder) { m.dispose?.(); return null; }
  m.root.position.set(pos[0], pos[1], pos[2]);
  m.root.rotation.y = yaw;
  if (scale !== 1) m.root.scale.setScalar(scale);
  m.root.traverse((o) => { if (o.isMesh) o.castShadow = shadow && o.castShadow; });
  ev.view.add(m.root);
  ev.own.push(m);
  m.update(0, typeof state === 'function' ? state(0, 0) : state);
  ev.updaters.push((dt, t) => m.update(dt, typeof state === 'function' ? state(dt, t) : state));
  cullByView(ev, m.root, pos[0], pos[1] + 1.5, pos[2], 4 * scale, far);
  W8_USED.add(name);
  return m;
}
/** Instanz-Fläche (eigenes Material nach Vertexfarben), ohne Frustum-Culling (die Instanzen bewegen sich). */
function instanced(ev, geo, n, opts = {}) {
  const m = new THREE.InstancedMesh(geo, opts.material ?? vcol(opts.rough ?? 0.5, opts.extra ?? {}, opts.key ?? 'w8inst'), n);
  m.frustumCulled = false;
  m.castShadow = !!opts.shadow;
  m.receiveShadow = false;
  m.name = `w8:${opts.name ?? 'instanzen'}`;
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
/** Objekt nur zeichnen, wenn seine Hüllkugel im Bild und näher als far m ist. */
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
function addGeo(ev, key, make, x, y, z, yaw = 0, cast = true, material, tile) {
  const t = tile ?? (material === 'glow' ? 'w8:leuchten' : material === 'stone' ? 'w8:wasser' : undefined);
  ev.addStatic(place(cached(key, make).clone(), x, y, z, yaw), { castShadow: cast, material, ...(t ? { tile: t } : {}) });
}
/** Eigenes bewegtes Mesh (Vertexfarben) an (x, y, z). */
function mover(ev, geo, x, y, z, name, shadow = true, material = null) {
  const m = new THREE.Mesh(geo, material ?? vcol(0.55, {}, 'w8decor'));
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.name = `w8:${name}`;
  ev.view.add(m);
  return m;
}
/** Zustand für Tests (state().decor) ergänzen. */
function addInfo(ev, fn) {
  const prev = ev.liveInfo;
  ev.liveInfo = () => ({ ...(prev ? prev() : {}), ...fn() });
}
const modelsInfo = (ev) => addInfo(ev, () => ({ w8models: [...W8_USED].sort(), w8heavy: Object.fromEntries(W8_HEAVY) }));
/** Weiches Leucht-Sprite (additiv, eigenes Material). */
function haloSprite(ev, color, size, opacity) {
  const mat = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, transparent: true, opacity, depthWrite: false, fog: true });
  ev.own.push(mat);
  const sp = new THREE.Sprite(mat);
  sp.scale.setScalar(size);
  return sp;
}
/** Stachel (Kegel mit Fuß), Instanz-Vorlage. */
const spikeGeo = () => cached('w8m:spike', () => {
  const b = new Build();
  b.cone(0.16, 0.6, { v: (px, py) => mix(0x8a94a8, 0xf4f6fa, py + 0.5) }, { p: [0, 0.3, 0] }, 6);
  return b.geometry();
});

// ------------------------------------------------------------------ 8-1 Regenfestung

function rainFort(ev, x, y, z) {
  // Mauern (Vorderseite +X der Modelle): Südmauer zur Kamera, West- und Ostmauer; Wachtürme an den Ecken
  const walls = [[x, z + 5.2, FRONT, 10], [x - 6.2, z, Math.PI, 9], [x + 6.2, z, 0, 9]];
  let regs = 0;
  for (const [wx, wz, yaw, L] of walls) {
    if (bake8(ev, 'regenfestung', { kind: 'mauer', length: L, height: yaw === FRONT ? 3 : 4.2 }, [wx, y, wz], yaw, 1, null, true, 2600)) { regs++; continue; }
    addGeo(ev, `w8m:rfwall:${L}`, () => new Build().box(1.2, 4, L, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x9aa8c4 : mix(0x3a4458, 0x6a7896, py / 4)) }, { p: [0, 2, 0] }, 0.05).geometry(), wx, y, wz, yaw);
  }
  for (const [tx, tz] of [[x - 6.2, z + 5.2], [x + 6.2, z - 5]]) {
    if (!bake8(ev, 'regenfestung', { kind: 'turm', height: 8 }, [tx, y, tz], FRONT, 1, null, true, 1800)) {
      addGeo(ev, 'w8m:rftower', () => {
        const b = new Build();
        b.cyl(1.8, 2, 8, { v: (px, py) => mix(0x3a4458, 0x6a7896, py / 8 + 0.5) }, { p: [0, 4, 0] }, 12);
        b.cone(2.4, 3, 0x3a2e5a, { p: [0, 9.5, 0] }, 12);
        return b.geometry();
      }, tx, y, tz);
    }
    solidCyl(ev, tx, tz, 2.1, y, y + 9, 'turm');
  }
  for (const [px, pz] of [[x - 2, z + 1], [x + 2.8, z - 2.2]]) bake8(ev, 'regenfestung', { kind: 'pfuetze', size: 2.2 }, [px, y + 0.02, pz], 0, 1, { rain: 1 }, false, 1400);
  // Stachelbrücken: zwei schmale Stege vom Fels zum Ufer, Stacheln fahren im Takt aus (abwechselnd je Zählzeit)
  const bridges = ev.def.bridges ?? [];
  const deck = new Build();
  const spikes = [];
  bridges.forEach(([ax, az, bx, bz, by], k) => {
    const L = Math.hypot(bx - ax, bz - az), yaw = Math.atan2(-(bz - az), bx - ax), n = Math.max(2, Math.round(L / 0.6));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      deck.box(L / n - 0.05, 0.18, 1.5, i % 2 ? 0x5a6680 : 0x6a7690, { p: [ax + (bx - ax) * u, by - 0.09, az + (bz - az) * u], r: [0, yaw, 0] }, 0);
    }
    for (const s of [-1, 1]) deck.box(L, 0.1, 0.1, 0x3a3a48, { p: [(ax + bx) / 2 - Math.sin(yaw) * s * 0.8, by + 0.05, (az + bz) / 2 - Math.cos(yaw) * s * 0.8], r: [0, yaw, 0] }, 0);
    const m = Math.max(2, Math.round(L / 1.2));
    for (let i = 0; i < m; i++) for (const s of [-0.4, 0.4]) {
      const u = (i + 0.5) / m;
      spikes.push({ x: ax + (bx - ax) * u - Math.sin(yaw) * s, y: by, z: az + (bz - az) * u - Math.cos(yaw) * s, k });
    }
  });
  if (bridges.length) {
    ev.addStatic(deck.geometry(), { castShadow: true });
    const sm = instanced(ev, spikeGeo(), spikes.length, { name: 'stacheln', rough: 0.35 });
    let up = 0, step = 0, lastT = 0;
    // Stellung aus der Taktuhr: je Zählzeit eine Brücke, Stacheln schnell hoch, halten, sinken vor der nächsten Zählzeit
    const spikeAt = (t) => {
      const bt = beatNow8(t);
      const whole = Math.floor(bt.beat), frac = bt.beat - whole;
      return { step: ((whole % 2) + 2) % 2, up: frac < 0.12 ? frac / 0.12 : frac < 0.6 ? 1 : Math.max(0, 1 - (frac - 0.6) / 0.2) };
    };
    const putS = (t) => {
      lastT = t;
      ({ step, up } = spikeAt(t));
      spikes.forEach((sp, i) => { const h = sp.k === step ? up : 0; setInst(sm, i, sp.x, sp.y - 0.62 + h * 0.62, sp.z, 0, h > 0.02 ? 1 : 0.001); });
      sm.instanceMatrix.needsUpdate = true;
    };
    putS(0);
    ev.updaters.push((dt, t) => putS(t));
    cullByView(ev, sm, x - 8, y + 1, z, 14);
    addInfo(ev, () => { const c = spikeAt(lastT); return { spikebridges: { n: bridges.length, spikes: spikes.length, step: c.step, up: +c.up.toFixed(3), shown: { step, up: +up.toFixed(3) } } }; });
  }
  // eigene kleine Regenwolke: dunkle Wolkenkuppen (wiegen sich) und Regenschleier (Instanzen)
  const cy = y + 14;
  const cloud = mover(ev, cached('w8m:raincloud', () => {
    const b = new Build();
    for (const [px, py, pz, r] of [[0, 0, 0, 3.2], [-3.2, -0.4, 0.4, 2.4], [3.4, -0.3, -0.3, 2.6], [-1.2, 1.4, -0.6, 2.3], [1.6, 1.2, 0.8, 2.1], [0, -0.6, 2.4, 2.0]]) {
      b.sphere(r, { v: (qx, qy, qz, nx, ny) => mix(0x6a6a8a, 0xc8c8dc, ny * 0.5 + 0.5) }, { p: [px, py, pz], s: [1, 0.7, 1] }, 10, 7);
    }
    return b.geometry();
  }), x, cy, z, 'regenwolke', false, vcol(0.9, { emissive: 0x2a2a3a, emissiveIntensity: 0.5 }, 'w8cloud'));
  const ND = 110;
  const dropG = cached('w8m:raindrop', () => new THREE.BoxGeometry(0.055, 0.95, 0.055));
  const dropM = new THREE.MeshBasicMaterial({ color: 0xd0e8ff, transparent: true, opacity: 0.72, depthWrite: false, fog: true });
  ev.own.push(dropM);
  const drops = instanced(ev, dropG, ND, { name: 'regen', material: dropM });
  const seeds = [];
  for (let i = 0; i < ND; i++) { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / ND) * 7.5; seeds.push([Math.cos(a) * r, Math.sin(a) * r, (i * 0.618) % 1]); }
  const fallH = cy - 1.5 - y;
  const putR = (t) => {
    cloud.position.set(x + Math.sin(t * 0.21) * 0.8, cy + Math.sin(t * 0.5) * 0.25, z + Math.cos(t * 0.17) * 0.6);
    for (let i = 0; i < ND; i++) {
      const [dx, dz, ph] = seeds[i];
      const u = (t * 1.6 + ph) % 1;
      setInst(drops, i, cloud.position.x + dx, cy - 1.5 - u * fallH, cloud.position.z + dz, 0, 1, 0.12, 0);
    }
    drops.instanceMatrix.needsUpdate = true;
  };
  putR(0);
  ev.updaters.push((dt, t) => putR(t));
  cullByView(ev, drops, x, y + fallH / 2, z, 10);
  cullByView(ev, cloud, x, cy, z, 7, 160);
  addInfo(ev, () => ({ rain: { drops: ND, cloud: +cloud.position.y.toFixed(2), walls: regs } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-2 Dünen

function dunes(ev, x, y, z) {
  const d = ev.def;
  // Baron-Sandstatue (Registry, sonst eigene Sandbüste) auf der Düne
  for (const [sx, sy, sz, yaw, s] of d.statues ?? []) {
    if (!bake8(ev, 'baron_sandstatue', {}, [sx, sy, sz], FRONT + (yaw ?? 0), s ?? 1, null, true, 12500)) {
      addGeo(ev, 'w8m:sandbust', () => {
        const b = new Build();
        const sand = { v: (px, py, pz, nx, ny) => mix(0xb88a50, 0xf0d098, ny * 0.5 + 0.5) };
        b.box(2.4, 1.2, 2.4, sand, { p: [0, 0.6, 0] }, 0.1);
        b.sphere(1.3, sand, { p: [0, 2.3, 0] }, 12, 9);
        for (const s2 of [-1, 1]) b.sphere(0.45, sand, { p: [s2 * 1.0, 3.3, 0] }, 8, 6);
        b.cyl(0.9, 0.9, 1.4, sand, { p: [0, 4.0, 0] }, 12);
        b.cyl(1.4, 1.4, 0.18, sand, { p: [0, 3.4, 0] }, 12);
        return b.geometry();
      }, sx, sy, sz, yaw ?? 0);
    }
    solidCyl(ev, sx, sz, 1.5 * (s ?? 1), sy, sy + 4.2 * (s ?? 1), 'statue');
  }
  // Dünen weit verteilt: eigene Kachel (Fern-Ausblendung greift getrennt von Statue und Podest)
  for (const [px, py, pz, s, seed] of d.dunes ?? []) bake8(ev, 'duene', { size: s ?? 1, seed: seed ?? 1 }, [px, py, pz], FRONT + (seed ?? 0) * 0.4, 1, null, true, 3500, { name: `w8:${ev.id}:duenen`, lod: true });
  if (d.pilz) bake8(ev, 'sandskulptur_pilzling', {}, d.pilz, FRONT + 0.4, 1.2, null, true, 6000);
  if (d.schub) bake8(ev, 'schubfeld', { size: [3, 2] }, d.schub, -0.3, 1, { on: true }, false, 2800);
  // Segelflosse eines Sandflossers kreist im Sand (eigene, sparsame Form), Sandspritzer hinterher
  const [fx, fz, fr] = d.fin ?? [x, z, 4];
  const fin = mover(ev, cached('w8m:sandfin', () => {
    const b = new Build();
    const s = new THREE.Shape();
    s.moveTo(-0.8, 0); s.quadraticCurveTo(-0.3, 0.5, 0.2, 1.3); s.quadraticCurveTo(0.5, 0.5, 0.8, 0); s.lineTo(-0.8, 0);
    b.extrude(s, 0.14, { v: (px, py) => mix(0x2a9a9a, 0x7ae8d8, py) }, null, 0, 6);
    b.sphere(1, { v: (px, py, pz, nx, ny) => mix(0xc8783a, 0xf0a860, ny * 0.5 + 0.5) }, { p: [0.9, -0.1, 0], s: [1.4, 0.32, 0.7] }, 10, 5);
    for (const s2 of [-1, 1]) { b.sphere(0.16, 0xffffff, { p: [1.7, 0.1, s2 * 0.24] }, 6, 4); b.sphere(0.07, 0x1a1020, { p: [1.82, 0.12, s2 * 0.26] }, 4, 3); }
    return b.geometry();
  }), fx, y, fz, 'sandflosser', false);
  const puffG = cached('w8m:sandpuff', () => new Build().sphere(0.25, 0xf0d098, null, 6, 4).geometry());
  const puffs = instanced(ev, puffG, 4, { name: 'sandspritzer' });
  let finA = 0;
  const putF = (t) => {
    finA = t * 0.55;
    const px = fx + Math.cos(finA) * fr, pz = fz + Math.sin(finA) * fr * 0.7;
    fin.position.set(px, y - 0.02 + Math.abs(Math.sin(t * 3)) * 0.06, pz);
    fin.rotation.y = Math.atan2(-Math.cos(finA) * fr * 0.7, -Math.sin(finA) * fr);
    for (let i = 0; i < 4; i++) {
      const b2 = finA - 0.12 * (i + 1), u = ((t * 2 + i / 4) % 1);
      setInst(puffs, i, fx + Math.cos(b2) * fr, y + 0.1 + u * 0.4, fz + Math.sin(b2) * fr * 0.7, 0, 0.6 + u * 0.8 - (u > 0.8 ? (u - 0.8) * 5 : 0));
    }
    puffs.instanceMatrix.needsUpdate = true;
  };
  putF(0);
  ev.updaters.push((dt, t) => putF(t));
  cullByView(ev, fin, fx, y, fz, fr + 2);
  cullByView(ev, puffs, fx, y, fz, fr + 2);
  addInfo(ev, () => ({ dunes: { fin: +finA.toFixed(3), statues: (d.statues ?? []).length } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-3 Keks-Fabrik

function cookieFactory(ev, x, y, z) {
  // Halle (Vorderseite +Z): cremefarbene Wände, Schokoladen-Dach mit rosa Zuckerguss-Nasen, Keks-Wappen, Rundfenster
  addGeo(ev, 'w8m:factory', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xf0dcc0 : mix(0xd8b890, 0xf4e2c8, py / 6)) };
    b.box(20, 6, 8, wall, { p: [0, 3, 0] }, 0.08, 1);
    // Sägezahn-Dach aus Schokolade mit Guss
    for (let i = 0; i < 4; i++) {
      const sh = new THREE.Shape();
      sh.moveTo(-2.5, 0); sh.lineTo(2.5, 0); sh.lineTo(2.5, 2.2); sh.lineTo(-2.5, 0);
      b.extrude(sh, 8.4, { v: (px, py, pz, nx, ny) => (ny > 0.3 ? 0x6a3a22 : 0x4a2816) }, { p: [-7.5 + i * 5, 6, 0] }, 0, 1);
      for (let k = 0; k < 6; k++) b.sphere(0.3, 0xffb8d8, { p: [-9.6 + i * 5 + k * 0.85, 6.0 - (k % 2) * 0.25, 4.15], s: [1, 1.4, 0.6] }, 6, 4);
    }
    // Keks-Wappen vorn, Tor
    b.cyl(1.6, 1.6, 0.3, { v: (px, py, pz, nx, ny, nz) => (Math.abs(nz) > 0.5 ? 0xe8b06a : 0xc88a4a) }, { p: [0, 4.2, 4.1], r: [Math.PI / 2, 0, 0] }, 16);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; b.sphere(0.16, 0x5a3018, { p: [Math.cos(a) * 0.9, 4.2 + Math.sin(a) * 0.9, 4.28] }, 5, 3); }
    const door = new THREE.Shape();
    door.moveTo(-1.6, 0); door.lineTo(-1.6, 2.2); door.absarc(0, 2.2, 1.6, Math.PI, 0, true); door.lineTo(1.6, 0); door.lineTo(-1.6, 0);
    b.extrude(door, 0.1, 0x6a3a22, { p: [0, 0, 4.06] }, 0, 8);
    // Schornsteine (Ringel rot/weiß) auf dem Dach
    for (const sx of [-6, 0.5, 6.5]) {
      b.cyl(0.75, 0.9, 5, { v: (px, py) => (Math.floor((py + 2.5) * 1.2) % 2 ? 0xe8303e : 0xfff2e6) }, { p: [sx, 8.8, -2.2] }, 10);
      b.cyl(1.0, 1.0, 0.4, 0x3a2a2a, { p: [sx, 11.4, -2.2] }, 10);
    }
    return b.geometry();
  }, x, y, z);
  addGeo(ev, 'w8m:factorywin', () => {
    const b = new Build();
    for (const wx of [-7.5, -4.5, 4.5, 7.5]) b.cyl(0.6, 0.6, 0.05, 0xffd88a, { p: [wx, 3.6, 4.05], r: [Math.PI / 2, 0, 0] }, 12);
    return b.geometry();
  }, x, y, z, 0, false, 'glow');
  // Keksturm (Registry) seitlich, Zuckerguss-Maschine
  if (!bake8(ev, 'keksfabrik', { kind: 'keksturm' }, [x + 13, y, z + 1.5], FRONT, 1, null, true, 5200)) {
    addGeo(ev, 'w8m:cookietower', () => {
      const b = new Build();
      for (let i = 0; i < 5; i++) b.cyl(2.2 - i * 0.25, 2.2 - i * 0.25, 0.9, { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xffb8d8 : 0xd8a060) }, { p: [0, 0.45 + i * 1.2, 0], r: [0, i, 0] }, 14);
      b.sphere(0.5, 0xe8283a, { p: [0, 6.5, 0] }, 8, 6);
      return b.geometry();
    }, x + 13, y, z + 1.5);
  }
  bake8(ev, 'keksfabrik', { kind: 'zuckerguss' }, [x - 13, y, z + 1.5], FRONT, 1, { flow: 1 }, true, 2600);
  // Fließband mit fahrenden Keksen vor der Halle (Registry, sonst eigenes Band mit Keks-Instanzen)
  const band = live8(ev, 'keksfabrik', { kind: 'band', length: 9 }, [x - 3, y, z + 6.4], 0, 1, { speed: 1 }, true, 5600);
  let bandOwn = null;
  if (!band) {
    addGeo(ev, 'w8m:band', () => new Build().box(9, 0.3, 1.6, 0x3a3a46, { p: [0, 1.1, 0] }, 0.04).geometry(), x - 3, y, z + 6.4);
    const kg = cached('w8m:keks', () => new Build().cyl(0.45, 0.45, 0.14, 0xe0aa64, null, 12).geometry());
    bandOwn = instanced(ev, kg, 5, { name: 'band-kekse' });
  }
  // Keksrad (steht, dreht sich) und Keks-Zahnrad greifen ineinander (Registry, sonst eigene Scheiben)
  const rad = { angle: 0 }, zahn = { angle: 0 };
  const kr = live8(ev, 'keksrad', { size: 4, axis: 'z', color: 'hell' }, [x - 10.5, y + 3.0, z + 5.2], 0, 1, () => rad, true, 8000);
  const kz = live8(ev, 'keks_zahnrad', { radius: 1.6, teeth: 10, axis: 'z' }, [x - 7.3, y + 4.6, z + 5.0], 0, 1, () => zahn, true, 6000);
  const ownWheels = [];
  if (!kr) ownWheels.push(mover(ev, cached('w8m:cookiewheel', () => new Build().cyl(2, 2, 0.5, { v: (px, py, pz, nx, ny, nz) => (Math.abs(nz) > 0.5 ? 0xe8b06a : 0xc88a4a) }, { r: [Math.PI / 2, 0, 0] }, 18).geometry()), x - 10.5, y + 3, z + 5.2, 'keksrad'));
  let ang = 0;
  ev.updaters.push((dt, t) => {
    ang = t * 0.6;
    rad.angle = ang; zahn.angle = -ang * 1.25;
    for (const w of ownWheels) w.rotation.z = ang;
    if (bandOwn) { for (let i = 0; i < 5; i++) setInst(bandOwn, i, x - 7.2 + ((t * 0.9 + i / 5) % 1) * 8.4, y + 1.33, z + 6.4, 0, 1); bandOwn.instanceMatrix.needsUpdate = true; }
  });
  solidBox(ev, x - 7.5, y, z + 5.4, x + 1.5, y + 1.4, z + 7.4, 'band');
  addInfo(ev, () => ({ cookie: { angle: +ang.toFixed(3), wheel: !!kr, gear: !!kz, band: !!band } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-Zug Bahnhof mit Baron-Express

function baronStation(ev, x, y, z) {
  const d = ev.def;
  const pz = d.platformZ ?? z + 4;   // Bahnsteigkante (Süden des Gleises)
  // Bahnsteigdach: Pfosten am Bahnsteig, rotes Dach mit Goldkante, Uhr in der Mitte
  addGeo(ev, 'w8m:canopy', () => {
    const b = new Build();
    for (const sx of [-8, 0, 8]) b.cyl(0.18, 0.22, 4.4, { v: (px, py) => mix(0x3a3046, 0x6a5a7e, py / 4.4 + 0.5) }, { p: [sx, 2.2, 0] }, 8);
    b.box(19, 0.3, 5, { v: (px, py, pz2, nx, ny) => (ny > 0.5 ? 0xc8303e : 0x7a1a2a) }, { p: [0, 4.5, -1.4], r: [-0.08, 0, 0] }, 0.04);
    b.box(19.2, 0.18, 0.2, 0xffc83a, { p: [0, 4.35, 1.1] }, 0);
    b.box(1.8, 1.8, 0.3, 0x2a2232, { p: [0, 5.6, 0.6] }, 0.08);
    b.cyl(0.75, 0.75, 0.12, 0xfff6e0, { p: [0, 5.6, 0.78], r: [Math.PI / 2, 0, 0] }, 16);
    b.box(0.08, 0.6, 0.04, 0x1a1020, { p: [0, 5.8, 0.86] }, 0);
    b.box(0.45, 0.07, 0.04, 0x1a1020, { p: [0.18, 5.6, 0.86], r: [0, 0, 0.3] }, 0);
    return b.geometry();
  }, x, y + 0.2, pz);
  for (const sx of [-8, 0, 8]) solidCyl(ev, x + sx, pz, 0.3, y, y + 4.6, 'pfosten');
  // Baron-Express: Lok mit Bärengesicht und Zylinder-Schornstein, zwei Wagen (eigene Gestaltung, Fahrtrichtung +X)
  const train = new THREE.Group();
  train.name = 'w8:baronexpress';
  const loco = new THREE.Mesh(cached('w8m:loco', () => {
    const b = new Build();
    const red = { v: (px, py, pz2, nx, ny) => mix(0x8a1a2a, 0xe0404a, ny * 0.4 + 0.5) };
    b.box(5.6, 0.5, 2.2, 0x2a2232, { p: [0, 0.75, 0] }, 0.05);
    b.cyl(1.0, 1.0, 3.6, red, { p: [0.6, 1.95, 0], r: [0, 0, Math.PI / 2] }, 14);
    for (const xx of [-0.6, 1.0, 2.2]) b.torus(1.02, 0.06, 0xffc83a, { p: [xx, 1.95, 0], r: [0, Math.PI / 2, 0] }, 4, 16);
    b.box(1.8, 2.4, 2.1, red, { p: [-1.9, 2.0, 0] }, 0.08);
    b.box(2.1, 0.25, 2.4, 0x2a2232, { p: [-1.9, 3.3, 0] }, 0.04);
    // Bärengesicht vorn: Ohren, Augen, Schnauze, Monokel
    b.cyl(0.95, 0.95, 0.2, 0x8a5a34, { p: [2.5, 1.95, 0], r: [0, 0, Math.PI / 2] }, 16);
    for (const s of [-1, 1]) {
      b.sphere(0.32, 0x8a5a34, { p: [2.5, 2.85, s * 0.68] }, 8, 6);
      b.sphere(0.15, 0xffffff, { p: [2.62, 2.15, s * 0.36] }, 6, 4);
      b.sphere(0.07, 0x1a1020, { p: [2.7, 2.15, s * 0.36] }, 5, 3);
    }
    b.sphere(0.35, 0xe2b585, { p: [2.66, 1.7, 0], s: [0.6, 0.8, 1] }, 8, 6);
    b.sphere(0.12, 0x1a1020, { p: [2.78, 1.85, 0] }, 5, 3);
    b.torus(0.22, 0.04, 0xffc83a, { p: [2.66, 2.15, 0.36], r: [0, Math.PI / 2, 0] }, 3, 10);
    // Zylinder-Schornstein mit rotem Band
    b.cyl(0.5, 0.5, 1.3, 0x1e1a26, { p: [1.4, 3.5, 0] }, 12);
    b.cyl(0.8, 0.8, 0.12, 0x1e1a26, { p: [1.4, 2.9, 0] }, 12);
    b.cyl(0.52, 0.52, 0.25, 0xc4304e, { p: [1.4, 3.05, 0] }, 12);
    for (const xx of [-2.0, -0.6, 0.9, 2.1]) for (const s of [-1, 1]) { b.cyl(0.5, 0.5, 0.2, 0x2a2a34, { p: [xx, 0.5, s * 1.05], r: [Math.PI / 2, 0, 0] }, 12); b.cyl(0.2, 0.2, 0.24, 0xffc83a, { p: [xx, 0.5, s * 1.06], r: [Math.PI / 2, 0, 0] }, 6); }
    return b.geometry();
  }), vcol(0.45, {}, 'w8train'));
  const wagonG = cached('w8m:wagon', () => {
    const b = new Build();
    b.box(4.6, 0.4, 2.1, 0x2a2232, { p: [0, 0.7, 0] }, 0.04);
    b.box(4.4, 1.8, 2.0, { v: (px, py, pz2, nx, ny) => (ny > 0.6 ? 0x5a1a3a : mix(0x6a2a5a, 0x9a4a8a, py / 3)) }, { p: [0, 1.85, 0] }, 0.1);
    b.box(4.6, 0.2, 2.2, 0xffc83a, { p: [0, 2.85, 0] }, 0.03);
    for (const xx of [-1.4, 0, 1.4]) for (const s of [-1, 1]) b.box(0.9, 0.8, 0.04, 0xffe8a0, { p: [xx, 2.0, s * 1.01] }, 0);
    for (const xx of [-1.5, 1.5]) for (const s of [-1, 1]) b.cyl(0.42, 0.42, 0.18, 0x2a2a34, { p: [xx, 0.45, s * 1.0], r: [Math.PI / 2, 0, 0] }, 10);
    return b.geometry();
  });
  // Lok und beide Wagen in einer Fläche (ein Zeichenaufruf statt drei, auch im Schattenpass)
  const zugG = cached('w8m:zug', () => mergeGeometries([loco.geometry, wagonG.clone().translate(-5.4, 0, 0), wagonG.clone().translate(-10.4, 0, 0)].map((g) => (g.index ? g.toNonIndexed() : g)), false) ?? false);
  if (zugG) loco.geometry = zugG;
  else for (let i = 0; i < 2; i++) { const w = new THREE.Mesh(wagonG, loco.material); w.position.x = -5.4 - i * 5.0; w.castShadow = true; train.add(w); }
  loco.castShadow = true;
  train.add(loco);
  train.position.set(x, y + 0.3, z);
  ev.view.add(train);
  // Dampfwölkchen aus dem Schornstein
  const puffG = cached('w8m:steam', () => new Build().sphere(0.5, { v: (px, py, pz2, nx, ny) => mix(0xd8d0e0, 0xffffff, ny * 0.5 + 0.5) }, null, 7, 5).geometry());
  const NP = 6;
  const puffs = instanced(ev, puffG, NP, { name: 'dampf' });
  const range = d.range ?? 7;
  let tx = 0;
  const putT = (t) => {
    const ph = (t % 20) / 20;
    const u = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const e = u * u * (3 - 2 * u);
    tx = -range + e * range * 2;
    train.position.x = x + tx;
    const moving = Math.abs(Math.sin(ph * TAU)) > 0.15;
    for (let i = 0; i < NP; i++) {
      const k = (t * 0.7 + i / NP) % 1;
      setInst(puffs, i, train.position.x + 1.4 - k * (moving ? 2.4 : 0.6) * Math.sign(Math.cos(ph * TAU) || 1), y + 0.3 + 4.3 + k * 2.6, z + Math.sin(i * 1.7) * 0.3 * k, 0, 0.5 + k * 0.9 - (k > 0.85 ? (k - 0.85) * 6 : 0));
    }
    puffs.instanceMatrix.needsUpdate = true;
  };
  putT(0);
  ev.updaters.push((dt, t) => putT(t));
  cullByView(ev, train, x, y + 2, z, range + 9, 60);
  cullByView(ev, puffs, x, y + 5, z, range + 6, 60);
  addInfo(ev, () => ({ train: { x: +tx.toFixed(3), wagons: 2 } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-4 Nacht-Festung mit Leuchtstegen

function nightFort(ev, x, y, z) {
  const d = ev.def;
  // Mauern mit Zinnen (dunkelblau) und Rundtürme mit blau glimmenden Fenstern
  const wallG = (len, h) => cached(`w8m:nfwall:${len}:${h}`, () => {
    const b = new Build();
    const brick = (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a78a8 : ((Math.floor(py * 1.6) + Math.floor((px + pz) * 0.8)) & 1) ? 0x262c48 : 0x323a5c);
    b.box(len, h, 1.0, brick, { p: [0, h / 2, 0] }, 0);
    const n = Math.max(1, Math.round(len / 1.1));
    for (let i = 0; i < n; i += 2) b.box(Math.min(0.62, len / n * 0.6), 0.55, 1.04, 0x3a4470, { p: [-len / 2 + (i + 0.5) * (len / n), h + 0.27, 0] }, 0);
    return b.geometry();
  });
  for (const [wx, wz, len, h, yaw] of d.walls ?? []) {
    ev.addStatic(place(wallG(len, h).clone(), wx, y, wz, yaw ?? 0), { castShadow: true });
    const c = Math.abs(Math.cos(yaw ?? 0)), s = Math.abs(Math.sin(yaw ?? 0));
    const hx = (len / 2) * c + 0.5 * s, hz = (len / 2) * s + 0.5 * c;
    solidBox(ev, wx - hx, y, wz - hz, wx + hx, y + h + 0.8, wz + hz, 'festungsmauer');
  }
  for (const [tx, tz, h] of d.towers ?? []) {
    addGeo(ev, `w8m:nftower:${h}`, () => {
      const b = new Build();
      b.cyl(1.8, 2.0, h, { v: (px, py, pz, nx) => mix(0x262c48, 0x3e4870, (py + h / 2) / h * 0.6 + Math.max(0, nx) * 0.3) }, { p: [0, h / 2, 0] }, 12);
      for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; b.box(0.5, 0.5, 0.5, 0x3e4870, { p: [Math.cos(a) * 1.7, h + 0.25, Math.sin(a) * 1.7], r: [0, -a, 0] }, 0); }
      b.cone(2.1, 2.6, { v: (px, py) => mix(0x1a2a6a, 0x3a5ad8, py / 2.6 + 0.5) }, { p: [0, h + 1.8, 0] }, 12);
      return b.geometry();
    }, tx, y, tz);
    addGeo(ev, `w8m:nftowerwin:${h}`, () => {
      const b = new Build();
      for (const [yy, a] of [[h * 0.45, 0.3], [h * 0.75, -0.35]]) b.box(0.45, 0.75, 0.05, 0x8ae0ff, { p: [Math.sin(a) * 2.0, yy, Math.cos(a) * 2.0], r: [0, a, 0] }, 0);
      return b.geometry();
    }, tx, y, tz, 0, false, 'glow');
    solidCyl(ev, tx, tz, 2.1, y, y + h + 2, 'turm');
  }
  // Leuchtstege: Kacheln eines unsichtbaren Stegs (Registry 'leuchtsteg' als Instanzen, sonst eigene Glas-Kacheln)
  const tiles = d.steps ?? [];
  let st = null, own = null;
  if (tiles.length && hasModel('leuchtsteg')) {
    try { st = createInstanced('leuchtsteg', tiles.length, { thick: 0.25 }); } catch { st = null; }
    if (st) { ev.view.add(st.root); ev.own.push(st); W8_USED.add('leuchtsteg'); }
  }
  if (tiles.length && !st) {
    own = instanced(ev, cached('w8m:glowtile', () => new Build().box(0.96, 0.2, 0.96, 0xffffff, { p: [0, 0.1, 0] }, 0.03).geometry()), tiles.length, { name: 'leuchtstege', material: glowMat(ev, 0xffffff, { transparent: true, opacity: 0.85 }) });
  }
  let wave = 0;
  const putL = (t) => {
    wave = t;
    tiles.forEach(([tx, ty, tz], i) => {
      const g = Math.max(0, Math.cos(t * 2.2 - i * 0.55));
      const glow = 0.15 + 0.85 * g * g;
      if (st) { st.setAt(i, [tx, ty, tz], 0, 1, { glow, flash: g > 0.97 ? 1 : 0 }); }
      else { setInst(own, i, tx, ty, tz, 0, 1); own.setColorAt(i, _c.setRGB(0.25 * glow, 0.75 * glow, 1.0 * glow)); }
    });
    if (st) st.update?.(0);
    if (own) { own.instanceMatrix.needsUpdate = true; if (own.instanceColor) own.instanceColor.needsUpdate = true; }
  };
  putL(0);
  ev.updaters.push((dt, t) => putL(t));
  if (st) cullByView(ev, st.root, x, y + 2, z, 12); else if (own) cullByView(ev, own, x, y + 2, z, 12);
  addInfo(ev, () => ({ nightfort: { steps: tiles.length, registry: !!st, wave: +wave.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-5 Unterwasser-Festung im See

function lakeFort(ev, x, y, z) {
  const wy = y + 0.55;   // Wasserspiegel
  const d = ev.def;
  // versunkene Türme (ragen aus dem Wasser), Dächer blau mit Goldspitze, glimmende Fenster
  for (const [tx, tz, h] of d.towers ?? []) {
    addGeo(ev, `w8m:lftower:${h}`, () => {
      const b = new Build();
      b.cyl(2.0, 2.2, h, { v: (px, py, pz, nx) => mix(0x3a5a6a, 0x7a9aa8, (py + h / 2) / h * 0.7 + Math.max(0, nx) * 0.2) }, { p: [0, h / 2, 0] }, 12);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; b.sphere(0.35, 0x4a8a5a, { p: [Math.cos(a) * 2.05, 1.4 + (i % 3) * 0.4, Math.sin(a) * 2.05], s: [1, 0.6, 1] }, 6, 4); }
      b.cone(2.5, 3, { v: (px, py) => mix(0x1a4a9a, 0x4a8ae8, py / 3 + 0.5) }, { p: [0, h + 1.5, 0] }, 12);
      b.cone(0.18, 0.8, 0xffc83a, { p: [0, h + 3.3, 0] }, 6);
      return b.geometry();
    }, tx, y, tz);
    addGeo(ev, `w8m:lftowerwin:${h}`, () => new Build().box(0.5, 0.8, 0.05, 0x9af0ff, { p: [0, h * 0.7, 2.18] }, 0).geometry(), tx, y, tz, 0, false, 'glow');
  }
  let nReg = 0;
  for (const [kind, px, pz, yaw, extra] of d.parts ?? []) {
    if (bake8(ev, 'wasserfestung', { kind, ...(extra ?? {}) }, [px, y + 0.1, pz], yaw ?? FRONT, 1, { sway: 0.5 }, true, 3400)) nReg++;
  }
  // Luftblasen steigen aus der versunkenen Festung
  const bubG = cached('w8m:bubble', () => new Build().sphere(0.16, 0xe8fcff, null, 7, 5).geometry());
  const NB = 10;
  const bubs = instanced(ev, bubG, NB, { name: 'luftblasen', material: glowMat(ev, 0xffffff, { transparent: true, opacity: 0.7, depthWrite: false }) });
  const putB = (t) => {
    for (let i = 0; i < NB; i++) {
      const u = (t * 0.45 + i / NB) % 1;
      const [bx, bz] = [[x - 3, z + 2], [x + 4, z - 1], [x + 1, z + 5]][i % 3];
      setInst(bubs, i, bx + Math.sin(u * 7 + i) * 0.3, wy - 0.2 + u * 1.6, bz + Math.cos(u * 5 + i) * 0.3, 0, 0.6 + u * 0.8 - (u > 0.85 ? (u - 0.85) * 5 : 0));
    }
    bubs.instanceMatrix.needsUpdate = true;
  };
  putB(0);
  ev.updaters.push((dt, t) => putB(t));
  cullByView(ev, bubs, x, wy, z, 8);
  // schwebender Wasserwürfel über dem See (Registry, wabbelt sacht)
  const wk = d.cube ? live8(ev, 'wasserkoerper', { size: [2.6, 2.6, 2.6] }, d.cube, 0, 1, (dt, t) => ({ wobble: 0.3 + 0.3 * Math.sin(t * 1.4) }), false, 3000) : null;
  if (wk) { const base = d.cube[1]; ev.updaters.push((dt, t) => { wk.root.position.y = base + Math.sin(t * 0.9) * 0.4; }); }
  addInfo(ev, () => ({ lakefort: { towers: (d.towers ?? []).length, registryParts: nReg, cube: !!wk } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-Haus Prüfungs-Haus (Krallen)

function clawHouse(ev, x, y, z) {
  addGeo(ev, 'w8m:clawhouse', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0xb89ad8 : mix(0x5a3a8a, 0x8a6ab8, py / 9)) };
    b.box(6, 8, 5, wall, { p: [0, 4, 0] }, 0.08, 1);
    b.cone(4.6, 3.4, { v: (px, py) => mix(0x8a1a3a, 0xd8304e, py / 3.4 + 0.5) }, { p: [0, 9.7, 0], r: [0, Math.PI / 4, 0] }, 4);
    // Krallen-Kratzspuren (drei helle Streifen) und Kletterhaken an der Front
    for (let i = 0; i < 3; i++) b.box(0.28, 3.6, 0.06, 0xf0e0ff, { p: [-1.2 + i * 0.8, 4.6, 2.53], r: [0, 0, 0.35] }, 0);
    for (let i = 0; i < 6; i++) b.sphere(0.16, 0xffc83a, { p: [1.8 - (i % 2) * 0.6, 1.4 + i * 1.05, 2.55] }, 5, 3);
    const door = new THREE.Shape();
    door.moveTo(-1.0, 0); door.lineTo(-1.0, 1.6); door.absarc(0, 1.6, 1.0, Math.PI, 0, true); door.lineTo(1.0, 0); door.lineTo(-1.0, 0);
    b.extrude(door, 0.12, 0x2a1a3a, { p: [-1.2, 0, 2.52] }, 0, 8);
    // Fragezeichen-Schild über der Tür
    b.cyl(0.7, 0.7, 0.14, 0xffc83a, { p: [-1.2, 3.6, 2.6], r: [Math.PI / 2, 0, 0] }, 14);
    return b.geometry();
  }, x, y, z);
  addGeo(ev, 'w8m:clawhousewin', () => {
    const b = new Build();
    for (const [px, py] of [[1.6, 6.4], [-1.6, 6.4]]) b.box(0.7, 0.9, 0.05, 0xffe08a, { p: [px, py, 2.53] }, 0);
    b.box(0.2, 0.55, 0.05, 0x8a1a3a, { p: [-1.2, 3.7, 2.68] }, 0);
    return b.geometry();
  }, x, y, z, 0, false, 'glow');
  solidBox(ev, x - 3.1, y, z - 2.6, x + 3.1, y + 11.5, z + 2.6, 'haus');
  // Krallen-Anzug schwebt über dem Haus und dreht sich (Registry, sonst eigene Tatze)
  const hp = [x, y + 12.6, z + 0.5];
  const suit = live8(ev, 'powerup_krallen', {}, hp, 0, 1.6, 'idle', false, 3000);
  let ownSuit = null;
  if (!suit) ownSuit = mover(ev, cached('w8m:claw', () => {
    const b = new Build();
    b.sphere(0.5, 0xffb83a, { p: [0, 0.5, 0] }, 10, 7);
    for (let i = 0; i < 3; i++) b.cone(0.1, 0.4, 0xffffff, { p: [-0.25 + i * 0.25, 1.05, 0.2], r: [0.4, 0, 0] }, 5);
    return b.geometry();
  }), hp[0], hp[1], hp[2], 'krallen', false);
  let spin = 0;
  ev.updaters.push((dt, t) => {
    spin = t * 1.2;
    const o = suit?.root ?? ownSuit;
    o.rotation.y = spin;
    o.position.y = hp[1] + Math.sin(t * 2) * 0.25;
  });
  addInfo(ev, () => ({ clawhouse: { spin: +spin.toFixed(3), registry: !!suit } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-6 Spukhaus

function darkMansion(ev, x, y, z) {
  addGeo(ev, 'w8m:mansion', () => {
    const b = new Build();
    const wall = { v: (px, py, pz, nx, ny) => (ny > 0.6 ? 0x6a5a7e : mix(0x2e2440, 0x4e3e66, py / 7)) };
    b.box(11, 6.5, 7, wall, { p: [0, 3.25, 0] }, 0.08, 1);
    const roof = new THREE.Shape();
    roof.moveTo(-6, 0); roof.lineTo(0, 3.4); roof.lineTo(6, 0); roof.lineTo(-6, 0);
    b.extrude(roof, 7.6, { v: (px, py, pz, nx, ny) => (ny > 0.3 ? 0x4a2a5a : 0x2e1a3a) }, { p: [0, 6.5, 0] }, 0, 1);
    // Türmchen links mit Spitzdach
    b.cyl(1.8, 1.9, 9, wall, { p: [-6.2, 4.5, 1.6] }, 10);
    b.cone(2.3, 4.2, { v: (px, py) => mix(0x2e1a3a, 0x6a3a8a, py / 4.2 + 0.5) }, { p: [-6.2, 11.1, 1.6] }, 10);
    b.cone(0.12, 1.0, 0xffc83a, { p: [-6.2, 13.6, 1.6] }, 5);
    // Veranda mit Säulen und Stufen, Tür
    for (const sx of [-1.8, 1.8]) b.cyl(0.18, 0.2, 3, 0xd8c8e0, { p: [sx, 1.5, 4.2] }, 8);
    b.box(5, 0.25, 1.8, 0x5a3a6a, { p: [0, 3.1, 4.0] }, 0.04);
    for (let i = 0; i < 2; i++) b.box(4 - i * 0.6, 0.25, 1.2 - i * 0.4, 0x6a5a7e, { p: [0, 0.12 + i * 0.25, 4.6 - i * 0.2] }, 0.03);
    const door = new THREE.Shape();
    door.moveTo(-0.9, 0); door.lineTo(-0.9, 1.8); door.absarc(0, 1.8, 0.9, Math.PI, 0, true); door.lineTo(0.9, 0); door.lineTo(-0.9, 0);
    b.extrude(door, 0.12, 0x1a1024, { p: [0, 0.5, 3.52] }, 0, 8);
    return b.geometry();
  }, x, y, z);
  // Fenster flackern warm (eigene Fläche, Farbe wechselt)
  const winMat = glowMat(ev, 0xffc85a);
  const win = mover(ev, cached('w8m:mansionwin', () => {
    const b = new Build();
    for (const [px, py] of [[-3.4, 4.6], [3.4, 4.6], [-3.4, 1.8], [3.4, 1.8], [0, 7.6]]) {
      const w = new THREE.Shape();
      w.moveTo(-0.5, -0.6); w.lineTo(-0.5, 0.2); w.absarc(0, 0.2, 0.5, Math.PI, 0, true); w.lineTo(0.5, -0.6); w.lineTo(-0.5, -0.6);
      b.extrude(w, 0.02, 0xffffff, { p: [px, py, 3.52] }, 0, 6);
    }
    b.box(0.5, 0.8, 0.05, 0xffffff, { p: [-6.2, 7, 3.5] }, 0);
    return b.geometry();
  }), x, y, z, 'spukfenster', false, winMat);
  let flick = 0;
  ev.updaters.push((dt, t) => { flick = Math.sin(t * 3.7) + Math.sin(t * 1.3 + 1) > 1.2 ? 1 : 0; winMat.color.setHex(flick ? 0xfff0a0 : 0xffb84a); });
  solidBox(ev, x - 5.6, y, z - 3.6, x + 5.6, y + 10, z + 3.6, 'spukhaus');
  solidCyl(ev, x - 6.2, z + 1.6, 2.0, y, y + 12, 'tuermchen');
  solidBox(ev, x - 2.5, y, z + 3.6, x + 2.5, y + 3.3, z + 5.2, 'veranda');
  // großer Spukspiegel neben dem Haus (Registry, mit Spiegelbild-Stern), Licht-Helm auf einem Sockel
  const mp = [x + 7.6, y, z + 2.4];
  const mirror = live8(ev, 'spukspiegel', {}, mp, -Math.PI / 2 - 0.3, 1, (dt, t) => ({ star: Math.sin(t * 0.8) > 0, glow: 1 }), false, 6000);
  if (!mirror) {
    addGeo(ev, 'w8m:mirror', () => {
      const b = new Build();
      b.box(2.6, 4, 0.3, 0xc8a050, { p: [0, 2.4, 0] }, 0.1);
      b.box(2.1, 3.4, 0.05, 0x9ab8e8, { p: [0, 2.4, 0.16] }, 0);
      return b.geometry();
    }, mp[0], mp[1], mp[2], -0.3);
  }
  solidBox(ev, mp[0] - 1.4, y, mp[2] - 1.0, mp[0] + 1.4, y + 4.8, mp[2] + 1.0, 'spiegel');
  const hp = [x - 1.5, y, z + 7.4];
  addGeo(ev, 'w8m:helmstand', () => new Build().cyl(0.5, 0.6, 1.0, 0x6a5a7e, { p: [0, 0.5, 0] }, 10).geometry(), hp[0], hp[1], hp[2]);
  if (!bake8(ev, 'helm_licht', {}, [hp[0], hp[1] + 1.15, hp[2]], FRONT + 0.3, 1, null, true, 3000)) {
    addGeo(ev, 'w8m:helm', () => new Build().sphere(0.45, 0xffd23a, { p: [0, 1.4, 0], s: [1, 0.8, 1] }, 10, 6).geometry(), hp[0], hp[1], hp[2]);
  }
  solidCyl(ev, hp[0], hp[2], 0.65, y, y + 1.8, 'helmsockel');
  // kleine Spuk-Geister schweben ums Haus und schauen hervor (eine Instanz-Fläche, durchscheinend)
  const ghostG = cached('w8m:ghost', () => {
    const b = new Build();
    b.sphere(0.55, 0xffffff, { p: [0, 0.55, 0], s: [1, 1.1, 1] }, 10, 8);
    b.cone(0.55, 0.7, 0xffffff, { p: [0, -0.15, 0], r: [Math.PI, 0, 0] }, 10);
    for (const s of [-1, 1]) b.sphere(0.1, 0x2a1a3a, { p: [0.45, 0.7, s * 0.2], s: [0.5, 1, 1] }, 5, 3);
    b.sphere(0.12, 0xff8ab0, { p: [0.5, 0.42, 0], s: [0.4, 0.6, 1] }, 5, 3);
    return b.geometry();
  });
  const NG = 3;
  const ghosts = instanced(ev, ghostG, NG, { name: 'spukgeister', material: glowMat(ev, 0xe8e0ff, { transparent: true, opacity: 0.78, depthWrite: false, vertexColors: true }) });
  let peek = 0;
  const putG = (t) => {
    for (let i = 0; i < NG; i++) {
      const a = t * 0.4 + (i / NG) * TAU;
      const r = 7.2;
      const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r * 0.75;
      const tx = -Math.sin(a), tz = Math.cos(a) * 0.75;
      setInst(ghosts, i, px, y + 3.2 + Math.sin(t * 1.7 + i * 2) * 0.6, pz, Math.atan2(-tz, tx), 1);
    }
    peek = (Math.sin(t * 0.9) + 1) / 2;
    ghosts.instanceMatrix.needsUpdate = true;
  };
  putG(0);
  ev.updaters.push((dt, t) => putG(t));
  cullByView(ev, ghosts, x, y + 3, z, 9);
  addInfo(ev, () => ({ mansion: { flicker: flick, mirror: !!mirror, ghosts: NG, peek: +peek.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-7 Lava-Inferno

function inferno(ev, x, y, z) {
  const d = ev.def;
  const ly = y + 0.3;   // Lava-Oberfläche im Becken
  // Kristall-Felsklotz rollt im Lavabecken hin und her (Registry, sonst eigener Kristallfels)
  const [ax, bx] = d.roll ?? [x - 5, x + 5];
  const st = { anim: 'roll', roll: 0 };
  const size = 2.4;
  const rock = live8(ev, 'kristall_felsklotz', { size }, [ax, ly - 0.3, z], 0, 1, () => st, true, 6500, 90);
  let own = null;
  if (!rock) own = mover(ev, cached('w8m:crystalrock', () => {
    const b = new Build();
    b.add(new THREE.DodecahedronGeometry(1.2, 0), (qx, qy, qz, nx, ny) => mix(0x4a3a6a, 0x8a7aa8, ny * 0.5 + 0.5), {});
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.cone(0.22, 0.8, 0x7af0e8, { p: [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0.3], r: [0, 0, a - Math.PI / 2] }, 5); }
    return b.geometry();
  }), ax, ly + 0.9, z, 'kristallfels', true);
  let px = ax;
  ev.updaters.push((dt, t) => {
    const ph = (t % 14) / 14;
    const u = ph < 0.5 ? ph * 2 : 2 - ph * 2;
    const e = u * u * (3 - 2 * u);
    px = ax + (bx - ax) * e;
    const roll = (px - ax) / (size / 2);
    if (rock) { rock.root.position.x = px; st.roll = roll; st.anim = Math.abs(Math.sin(ph * TAU)) > 0.6 ? 'fast' : 'roll'; }
    else { own.position.x = px; own.rotation.z = -roll; }
  });
  // zweiter Felsklotz (Würfel) wartet am Rand
  if (d.cube && !bake8(ev, 'kristall_felsklotz', { size: 2.2, shape: 'wuerfel' }, d.cube, FRONT + 0.4, 1, 'idle', true, 6000)) {
    addGeo(ev, 'w8m:crystalcube', () => new Build().box(2.2, 2.2, 2.2, { v: (px2, py, pz, nx, ny) => mix(0x4a3a6a, 0x8a7aa8, ny * 0.5 + 0.5) }, { p: [0, 1.1, 0] }, 0.2).geometry(), d.cube[0], d.cube[1], d.cube[2]);
  }
  addInfo(ev, () => ({ inferno: { rock: +px.toFixed(3), registry: !!rock } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-A / 8-B Zirkuszelte

function tent(ev, x, y, z, radius, height, tint) {
  if (!bake8(ev, 'zirkuszelt', { radius, height }, [x, y, z], FRONT, 1, null, true, 4200, `w8:${ev.id}:zelt`)) {
    addGeo(ev, `w8m:tent:${radius}:${height}:${tint}`, () => {
      const b = new Build();
      const [c1, c2] = tint === 'gold' ? [0xffc83a, 0xffffff] : [0xff5a9a, 0xffffff];
      b.cyl(radius, radius, height * 0.45, { v: (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 16) % 2 ? c1 : c2) }, { p: [0, height * 0.225, 0] }, 24);
      b.cone(radius * 1.08, height * 0.6, { v: (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 16) % 2 ? c1 : c2) }, { p: [0, height * 0.45 + height * 0.3, 0] }, 24);
      b.cyl(0.1, 0.1, 2, 0xffc83a, { p: [0, height * 1.05 + 1, 0] }, 5);
      return b.geometry();
    }, x, y, z);
  }
  solidCyl(ev, x, z, radius * 0.88, y, y + height, 'zelt');
}
/** Sternen-Wimpel um ein Zelt: Kette von der Zeltspitze zu Pfosten (eigene Geometrie, flatternde Wimpel statisch). */
function starPennants(ev, x, y, z, radius, height, cols) {
  addGeo(ev, `w8m:tentpennants:${radius}:${height}:${cols.join('-')}`, () => {
    const b = new Build();
    const top = [0, height * 1.05, 0];
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k / 4) * TAU;
      const P = [Math.cos(a) * (radius + 2.2), 0, Math.sin(a) * (radius + 2.2)];
      b.cyl(0.08, 0.1, 3.4, 0x6a5a7e, { p: [P[0], 1.7, P[2]] }, 6);
      b.sphere(0.14, 0xffc83a, { p: [P[0], 3.45, P[2]] }, 6, 4);
      const n = 9;
      for (let i = 1; i < n; i++) {
        const u = i / n;
        const px = top[0] + (P[0] - top[0]) * u, py = top[1] + (3.4 - top[1]) * u - Math.sin(u * Math.PI) * 0.6, pz = top[2] + (P[2] - top[2]) * u;
        b.cone(0.22, 0.42, cols[i % cols.length], { p: [px, py - 0.2, pz], r: [Math.PI, a, 0] }, 3);
      }
    }
    return b.geometry();
  }, x, y, z, 0, false);
}

function goldTent(ev, x, y, z) {
  const R = 5.4, H = 7.5;
  tent(ev, x, y, z, R, H, 'gold');
  starPennants(ev, x, y, z, R, H, [0xffc83a, 0xffffff, 0xff8a3a]);
  // goldene Würfelblase sitzt vor dem Zelt (Registry, eingebacken; sonst eigener Goldwürfel mit Gesicht)
  const bp = [x - R + 0.2, y, z + R + 0.4];
  if (!bake8(ev, 'wuerfelblase', { color: 'gold' }, bp, FRONT + 0.5, 0.75, 'idle', true, 11500)) {
    addGeo(ev, 'w8m:goldblob', () => {
      const b = new Build();
      b.box(2.2, 2.0, 2.2, { v: (px, py, pz, nx, ny) => mix(0xd89a1a, 0xffe07a, ny * 0.5 + 0.5) }, { p: [0, 1.0, 0] }, 0.5);
      for (const s of [-1, 1]) { b.sphere(0.3, 0xffffff, { p: [s * 0.45, 1.3, 1.08] }, 7, 5); b.sphere(0.13, 0x1a1020, { p: [s * 0.45, 1.3, 1.3] }, 5, 3); }
      return b.geometry();
    }, bp[0], bp[1], bp[2], 0.5);
  }
  solidCyl(ev, bp[0], bp[2], 1.6, y, y + 3.0, 'wuerfelblase');
  // Goldsterne funkeln über dem Zelt (Instanzen, drehen sich)
  const starG = cached('w8m:goldstar', () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i / 10) * TAU, r = i % 2 ? 0.2 : 0.5; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    return new Build().extrude(s, 0.12, 0xffd23a, null, 0, 1).geometry();
  });
  const NS = 5;
  const stars = instanced(ev, starG, NS, { name: 'goldsterne', material: glowMat(ev, 0xffffff, { vertexColors: true }) });
  let sa = 0;
  const putS = (t) => {
    sa = t;
    for (let i = 0; i < NS; i++) { const a = t * 0.5 + (i / NS) * TAU; setInst(stars, i, x + Math.cos(a) * (R + 0.8), y + H * 0.75 + Math.sin(t * 2 + i) * 0.4, z + Math.sin(a) * (R + 0.8), t * 2 + i, 1); }
    stars.instanceMatrix.needsUpdate = true;
  };
  putS(0);
  ev.updaters.push((dt, t) => putS(t));
  cullByView(ev, stars, x, y + H * 0.75, z, R + 2);
  addInfo(ev, () => ({ goldtent: { stars: NS, spin: +sa.toFixed(3) } }));
  modelsInfo(ev);
}

function snakeTent(ev, x, y, z) {
  const R = 5.2, H = 7.2;
  tent(ev, x, y, z, R, H, 'rosa');
  starPennants(ev, x, y, z, R, H, [0xff6ab0, 0xffffff, 0x8a5ae8]);
  // rosa Schlangenkönig schaut aus seinem Korb und wiegt sich (eigene sparsame Figur, Krone)
  const kp = [x + R + 1.4, y, z + R * 0.45];
  addGeo(ev, 'w8m:basket', () => {
    const b = new Build();
    b.cyl(1.1, 0.9, 1.2, { v: (px, py, pz) => (Math.floor(((Math.atan2(pz, px) / TAU) + 1) * 14 + py * 3) % 2 ? 0xb8803e : 0xd8a058) }, { p: [0, 0.6, 0] }, 14);
    b.torus(1.1, 0.12, 0x8a5a2a, { p: [0, 1.2, 0], r: [Math.PI / 2, 0, 0] }, 4, 16);
    return b.geometry();
  }, kp[0], kp[1], kp[2]);
  solidCyl(ev, kp[0], kp[2], 1.2, y, y + 3.2, 'korb');
  const snake = mover(ev, cached('w8m:pinksnake', () => {
    const b = new Build();
    const body = { v: (px, py, pz, nx, ny) => (nx > 0.4 ? 0xffe0ec : mix(0xd84a8a, 0xff8ac0, ny * 0.5 + 0.5)) };
    for (let i = 0; i < 5; i++) b.sphere(0.5 - i * 0.03, body, { p: [Math.sin(i * 0.9) * 0.2, 0.3 + i * 0.42, 0] }, 9, 6);
    b.sphere(0.62, body, { p: [0.2, 2.5, 0], s: [1.3, 0.9, 1] }, 10, 7);
    for (const s of [-1, 1]) { b.sphere(0.2, 0xffffff, { p: [0.55, 2.75, s * 0.3] }, 7, 5); b.sphere(0.09, 0x1a1020, { p: [0.7, 2.76, s * 0.32] }, 5, 3); }
    b.box(0.5, 0.06, 0.08, 0xe8304e, { p: [1.0, 2.3, 0] }, 0);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; b.cone(0.1, 0.32, 0xffc83a, { p: [0.2 + Math.cos(a) * 0.32, 3.05, Math.sin(a) * 0.32] }, 4); }
    b.torus(0.34, 0.06, 0xffc83a, { p: [0.2, 2.95, 0], r: [Math.PI / 2, 0, 0] }, 3, 12);
    return b.geometry();
  }), kp[0], kp[1] + 0.4, kp[2], 'rosa-schlangenkoenig', true);
  snake.rotation.y = -Math.PI / 2 - 0.5;
  let sway = 0;
  ev.updaters.push((dt, t) => {
    const p = (t % 8) / 8;
    const up = p < 0.15 ? p / 0.15 : p < 0.7 ? 1 : p < 0.85 ? 1 - (p - 0.7) / 0.15 : 0;
    const e = up * up * (3 - 2 * up);
    snake.position.y = kp[1] - 1.6 + e * 2.0;
    sway = Math.sin(t * 2.2) * 0.18 * e;
    snake.rotation.z = sway;
    snake.visible = e > 0.02;
  });
  for (const [px, pz] of ev.def.puddles ?? []) bake8(ev, 'lavapfuetze', { size: 1.8 }, [px, y + 0.02, pz], 0, 1, 'idle', false, 2400);
  addInfo(ev, () => ({ snaketent: { sway: +sway.toFixed(3) } }));
  modelsInfo(ev);
}

// ------------------------------------------------------------------ 8-Burg Baron-Turm

function baronTower(ev, x, y, z) {
  const H = 40;
  const finished = gameFinished();
  // der riesige Baron-Turm (Registry 'baron_turm' ganz, Büste blickt zur Kamera); eigene Kachel ohne Fern-Ausblendung
  let top = y + 32.6;
  if (!bake8(ev, 'baron_turm', { part: 'ganz', height: H }, [x, y, z], FRONT, 1, null, true, 12500, 'w8:turm')) {
    addGeo(ev, 'w8m:tower', () => {
      const b = new Build();
      b.cyl(7, 9, 32, { v: (px, py, pz, nx) => mix(0x3a2e4a, 0x7a6a90, (py + 16) / 32 * 0.6 + Math.max(0, nx) * 0.3) }, { p: [0, 16, 0] }, 20);
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; b.box(1.3, 1.4, 0.8, 0x5a4a6e, { p: [Math.cos(a) * 6.6, 32.7, Math.sin(a) * 6.6], r: [0, -a, 0] }, 0); }
      b.sphere(3.4, 0x8a5a4a, { p: [0, 36.4, 0] }, 14, 10);
      b.cyl(2.4, 2.3, 4.4, 0x1e1a26, { p: [0, 41.5, 0] }, 14);
      b.cyl(4, 4, 0.3, 0x1e1a26, { p: [0, 39.4, 0] }, 16);
      return b.geometry();
    }, x, y, z, 0, true, undefined, 'w8:turm');
    top = y + 32.6;
  }
  solidCyl(ev, x, z, 9.4, y - 0.5, y + 48, 'turm');
  // roter Teppich von der Zugbrücke zum Podest (Goldkanten)
  if (ev.def.carpet) {
    const [cx0, cz0, cx1, cz1] = ev.def.carpet;
    const cb = new Build();
    cb.box(cx1 - cx0, 0.03, cz1 - cz0, 0xc8303e, { p: [(cx0 + cx1) / 2, y + 0.02, (cz0 + cz1) / 2] }, 0);
    for (const sx of [cx0, cx1]) cb.box(0.14, 0.035, cz1 - cz0, 0xffc83a, { p: [sx, y + 0.025, (cz0 + cz1) / 2] }, 0);
    ev.addStatic(cb.geometry(), { castShadow: false });
  }
  // Glas der Freunde oben auf dem Zinnenkranz (vorn rechts neben der Büste): leise leuchtend; nach dem Spielende offen und leer
  const jp = ev.def.jar ?? [x + 3.9, top, z + 2.4];
  const jarB = new Build(), jarGl = new Build();
  jarB.cyl(1.25, 1.35, 0.3, 0xffc83a, { p: [0, 0.15, 0] }, 16);          // Sockel
  jarB.torus(0.98, 0.1, 0xffc83a, { p: [0, 2.3, 0], r: [Math.PI / 2, 0, 0] }, 4, 16);
  if (!finished) {
    jarB.cyl(0.85, 0.8, 0.45, 0xb8844a, { p: [0, 2.55, 0] }, 14);        // Korken
    jarB.box(0.5, 0.3, 0.12, 0xc4304e, { p: [0, 1.4, 0.97] }, 0.03);      // Siegel
    // die gefangenen Freunde als kleine Figuren darin (Häschen karamell/weiß/grau, Kobold grün)
    for (const [fx, fz, c, ear] of [[-0.35, 0.25, 0xd8a060, true], [0.38, 0.2, 0xf4f4fa, true], [0, -0.35, 0x9a94a8, true], [0.05, 0.45, 0x5ab86a, false]]) {
      jarB.sphere(0.24, c, { p: [fx, 0.62, fz] }, 8, 6);
      jarB.sphere(0.19, c, { p: [fx, 0.98, fz] }, 8, 6);
      if (ear) for (const s of [-1, 1]) jarB.capsule(0.05, 0.22, c, { p: [fx + s * 0.08, 1.28, fz] }, 2, 5);
      else jarB.cone(0.16, 0.3, 0x3a8a4a, { p: [fx, 1.27, fz] }, 6);
      for (const s of [-1, 1]) jarB.sphere(0.04, 0x1a1020, { p: [fx + s * 0.07, 1.0, fz + 0.17] }, 4, 3);
    }
  } else {
    // Korken liegt daneben, Konfetti-Sterne
    jarB.cyl(0.85, 0.8, 0.45, 0xb8844a, { p: [1.6, 0.5, 0.6], r: [0.3, 0, 1.2] }, 14);
    for (let i = 0; i < 6; i++) { const a = i * 1.1; jarGl.sphere(0.12, [0xff5a7a, 0xffd23a, 0x5ae8ff][i % 3], { p: [Math.cos(a) * 1.4, 0.35, Math.sin(a) * 1.4] }, 5, 3); }
  }
  ev.addStatic(place(jarB.geometry(), jp[0], jp[1], jp[2]), { castShadow: false, tile: 'w8:turm' });
  if (jarGl.parts.length) ev.addStatic(place(jarGl.geometry(), jp[0], jp[1], jp[2]), { material: 'glow', castShadow: false, tile: 'w8:leuchten' });
  // Glas (durchscheinend) und weicher Schein (pulsiert sacht)
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.32, roughness: 0.05, metalness: 0.1, depthWrite: false, emissive: 0x3a8ab8, emissiveIntensity: 0.6 });
  ev.own.push(glassMat);
  const glass = new THREE.Mesh(cached('w8m:jarglass', () => new THREE.CylinderGeometry(0.95, 0.95, 2.0, 18, 1, true)), glassMat);
  glass.position.set(jp[0], jp[1] + 1.3, jp[2]);
  glass.renderOrder = 4;
  glass.name = 'w8:freundeglas';
  ev.view.add(glass);
  const halo = haloSprite(ev, finished ? 0xfff0a0 : 0x9ae8ff, 6, 0.45);
  halo.position.set(jp[0], jp[1] + 1.4, jp[2]);
  halo.name = 'w8:glas-schein';
  ev.view.add(halo);
  let glow = 0;
  ev.updaters.push((dt, t) => {
    glow = 0.5 + 0.5 * Math.sin(t * 1.6);
    halo.material.opacity = 0.3 + 0.25 * glow;
    glassMat.emissiveIntensity = 0.45 + 0.4 * glow;
  });
  // Autowrack des Baron-Rennwagens am Turmplatz (Registry)
  if (ev.def.wreck && bake8(ev, 'autowrack', {}, ev.def.wreck, FRONT + 0.5, 1, { smoke: false }, true, 9000)) solidBox(ev, ev.def.wreck[0] - 2.2, y, ev.def.wreck[2] - 1.6, ev.def.wreck[0] + 2.2, y + 1.8, ev.def.wreck[2] + 1.6, 'wrack');
  // nach dem Spielende: die befreiten Freunde hüpfen winkend vor dem Turm
  const friends = [];
  if (finished) {
    const spots = ev.def.friends ?? [[x - 3, y, z + 14], [x - 1, y, z + 15], [x + 1, y, z + 15], [x + 3, y, z + 14]];
    ['kruemel', 'flocke', 'hoppel', 'kobold'].forEach((key, i) => {
      let g;
      try { g = friendGeo(key).lit; W8_USED.add('bunny_small'); } catch { g = null; }
      if (!g) g = cached('w8m:friendlo', () => new Build().sphere(0.3, 0xd8a060, { p: [0, 0.3, 0] }, 8, 6).geometry());
      const m = new THREE.Mesh(g, vcol(0.5, {}, 'w8friend'));
      const [fx, fy, fz] = spots[i % spots.length];
      m.position.set(fx, fy, fz);
      m.scale.setScalar(key === 'kobold' ? 1.5 : 2.0);
      m.castShadow = true;
      m.name = `w8:freund:${key}`;
      ev.view.add(m);
      friends.push({ m, base: [fx, fy, fz], ph: i * 0.7 });
    });
  }
  let hop = 0;
  if (friends.length) {
    ev.updaters.push((dt, t) => {
      for (const f of friends) {
        const u = Math.abs(Math.sin(t * 4 + f.ph));
        f.m.position.y = f.base[1] + u * 0.55;
        f.m.rotation.y = -Math.PI / 2 + Math.sin(t * 2.5 + f.ph) * 0.6;
        f.m.rotation.z = Math.sin(t * 8 + f.ph) * 0.12;
        hop = u;
      }
    });
    cullByView(ev, friends[0].m, x, y + 1, (ev.def.friends?.[0]?.[2] ?? z + 14), 6);
    for (const f of friends.slice(1)) ev.updaters.push(() => { f.m.visible = friends[0].m.visible; });
  }
  addInfo(ev, () => ({ tower: { height: H, jar: finished ? 'offen' : 'gefangen', glow: +glow.toFixed(3), friends: friends.length, hop: +hop.toFixed(3) } }));
  modelsInfo(ev);
}
