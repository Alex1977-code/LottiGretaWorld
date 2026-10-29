// Themen-Varianten für Remix-Level (Präzisierung „Motor und Bausteine Bonuswelten“): dasselbe Thema bei anderer Beleuchtung.
// remixTheme(name, { light, filter }) legt die Variante `<name>@<licht>` (bzw. `<name>@<licht>+sw`) einmal in THEMES an und
// liefert ihren Namen – das Level setzt ihn als LEVEL.theme, die Ansicht (CourseView → getTheme) kennt dann nichts Neues.
//
//   light   'nacht'   dunkelblauer Himmel, Mond und Sterne, kühles Mondlicht mit Schatten, sanftes Figurenlicht, keine Wolken
//           'abend'   Sonnenuntergang: Himmel von Lila über Rosa nach Orange, tiefe warme Sonne, warmer Dunst
//           'morgen'  Morgenrot: zartes Rosa-Gold am Horizont, helles, weiches Licht, leichter Dunst
//           'tag'     heller Taghimmel mit Sonne und Wolken (auch für Weltraum-Themen: „Taghimmel statt Weltraum“ – die
//                     Weltraum-Kulisse entfällt, Wolken darunter)
//           'dunkel'  stockdunkel: fast schwarzer Himmel, naher Nebel, kaum Grundlicht, kräftiges Figuren- und Laternenlicht
//   filter  'schwarzweiss'  nur Kennzeichnung im Thema (theme.filter); den Filter legt der Remix-Haken als CSS-Filter über
//                     die 3D-Leinwand (level/remix.js applyFilter)
// Die Kulisse des Grundthemas (buildBackdrop) wird übernommen und für nacht/dunkel/abend gedämpft bzw. getönt (unbeleuchtete
// Materialien der Kulisse, geklont); Gelände-Farben bleiben (das Licht färbt sie um). LIGHTS = Werte je Beleuchtung.

import * as THREE from 'three';
import { THEMES } from './themes.js';
import { starField } from './backdrop_w2.js';

const GRASS_SKY = [[1, 0x2b8de8], [0.45, 0x47aefb], [0.15, 0x8cd3ff], [0.03, 0xcbeeff], [0, 0xe6f7ff], [-0.1, 0xc6e0f2], [-1, 0xa6c6dc]];

export const LIGHTS = {
  nacht: {
    label: 'Nacht',
    sky: [[1, 0x050920], [0.45, 0x0b1434], [0.15, 0x172656], [0.03, 0x283a70], [0, 0x30447a], [-0.1, 0x182246], [-1, 0x080c20]],
    background: 0x121a3a, fog: { color: 0x18244c, k: [0.8, 0.85] },
    hemi: { sky: 0x8a9ae8, ground: 0x1a2040, intensity: 0.72 }, sun: { color: 0xb0c0ff, intensity: 1.3 },
    sunDisc: false, clouds: false, shadows: true, dim: 0.42, tint: 0x8aa0ff, stars: 900, moon: true,
    terrain: { color: 0x26347a, mix: 0.34, k: 0.78 },
    playerLight: { color: 0xd8e6ff, intensity: 9, distance: 8 },
  },
  abend: {
    label: 'Abendrot',
    sky: [[1, 0x2e2a74], [0.5, 0x7a4aa8], [0.22, 0xe8789a], [0.07, 0xffa070], [0, 0xffc88a], [-0.1, 0xd88a7a], [-1, 0x5a3a5a]],
    background: 0xf2a080, fog: { color: 0xf0a888, k: [0.9, 0.95] },
    hemi: { sky: 0xffc0a0, ground: 0x6a4a5a, intensity: 1.05 }, sun: { color: 0xffa868, intensity: 2.3, dir: [-0.7, 0.55, 0.45] },
    sunDisc: true, clouds: true, shadows: true, dim: 0.85, tint: 0xffb090, stars: 0,
    terrain: { color: 0xff8a5a, mix: 0.16, k: 0.95 },
  },
  morgen: {
    label: 'Morgenrot',
    sky: [[1, 0x5a8ae0], [0.45, 0x8ab8f0], [0.15, 0xf2c6d6], [0.03, 0xffdcc0], [0, 0xfff0d8], [-0.1, 0xe8d0d8], [-1, 0xb8b0c8]],
    background: 0xf8e2d6, fog: { color: 0xf4e0dc, k: [0.95, 1] },
    hemi: { sky: 0xffe2d8, ground: 0x8a8a7a, intensity: 1.2 }, sun: { color: 0xffdcb0, intensity: 2.4, dir: [0.6, 0.6, 0.5] },
    sunDisc: true, clouds: true, shadows: true, dim: 0.95, tint: 0xffe0d0, stars: 0,
    terrain: { color: 0xffc8d0, mix: 0.1, k: 1 },
  },
  tag: {
    label: 'Tag',
    sky: GRASS_SKY, background: 0xcbe9fb, fog: { color: 0xd3ecfb, near: 70, far: 260 },
    hemi: { sky: 0xc4e6ff, ground: 0x7fae58, intensity: 1.3 }, sun: { color: 0xfff0d2, intensity: 2.7, dir: [-0.42, 1, 0.5] },
    sunDisc: true, clouds: true, shadows: true, dim: 1, tint: null, stars: 0, day: true,
  },
  dunkel: {
    label: 'Stockdunkel',
    sky: [[1, 0x020204], [0, 0x05050a], [-1, 0x020204]],
    background: 0x040408, fog: { color: 0x040408, near: 10, far: 46 },
    hemi: { sky: 0x4a4a6a, ground: 0x0a0a10, intensity: 0.2 }, sun: { color: 0x8a8ab0, intensity: 0.14 },
    sunDisc: false, clouds: false, shadows: false, dim: 0.16, tint: 0x6a6a8a, stars: 0,
    terrain: { color: 0x1a1a2a, mix: 0.3, k: 0.7 },
    playerLight: { color: 0xffe2b0, intensity: 24, distance: 11 },
    lanternLight: { color: 0xffb44a, intensity: 22, distance: 11 },
    toy: { rim: 1.8, spec: 1.4, fill: 0.12 },
  },
};

const TERRAIN = ['grassTop', 'grassTop2', 'grassRim', 'grassSide', 'dirt', 'dirtDeep', 'rock', 'rockDeep', 'stone', 'stoneDark', 'wood', 'woodDark', 'climb', 'climbDark', 'water', 'waterDeep'];
const _a = new THREE.Color(), _b = new THREE.Color();
/** Hex-Farbe zur Lichtfarbe ziehen (mix) und abdunkeln (k). */
function tintHex(h, o) {
  _a.setHex(h).lerp(_b.setHex(o.color), o.mix).multiplyScalar(o.k);
  return _a.getHex();
}

/** Ist das Thema ein dunkles/Weltraum-Thema (Kulisse passt nicht zum Taghimmel)? */
const darkTheme = (t) => (t.hemi?.intensity ?? 1) < 1 || !!t.playerLight || new THREE.Color(t.background ?? 0xffffff).getHSL({}).l < 0.25;

/** Variante eines Themas (Objekt) – rein, ohne Registrierung. */
export function lightVariant(base, light, filter = null) {
  const L = LIGHTS[light];
  if (!L) return { ...base, filter: filter ?? base.filter ?? null };
  const t = { ...base, label: `${base.label ?? 'Thema'} (${L.label})`, light, filter: filter ?? base.filter ?? null };
  t.sky = L.sky;
  t.background = L.background;
  const f0 = base.fog ?? { color: 0xffffff, near: 70, far: 260 };
  t.fog = { color: L.fog.color, near: L.fog.near ?? f0.near * (L.fog.k?.[0] ?? 1), far: L.fog.far ?? f0.far * (L.fog.k?.[1] ?? 1) };
  t.hemi = { ...L.hemi };
  t.sun = { color: L.sun.color, intensity: L.sun.intensity, dir: L.sun.dir ?? base.sun?.dir ?? [-0.4, 1, 0.5] };
  t.sunDisc = L.sunDisc;
  t.shadows = L.shadows && base.shadows !== false;
  t.clouds = L.clouds && (L.day || base.clouds !== false);
  if (L.playerLight) t.playerLight = { ...L.playerLight, ...(base.playerLight && light === 'dunkel' ? { intensity: Math.max(L.playerLight.intensity, base.playerLight.intensity) } : {}) };
  else if (light === 'tag' || light === 'morgen' || light === 'abend') t.playerLight = null;
  if (L.lanternLight) t.lanternLight = base.lanternLight ?? L.lanternLight;
  // Gelände-Farben (Bausteine lesen sie beim Bauen aus dem Thema) in die Lichtfarbe ziehen – wie die eigenen Nacht-Themen
  if (L.terrain) {
    for (const k of TERRAIN) if (typeof base[k] === 'number') t[k] = tintHex(base[k], L.terrain);
    if (base.ground?.color !== undefined) t.ground = { ...base.ground, color: tintHex(base.ground.color, L.terrain) };
  }
  if (L.toy) t.toy = { ...(base.toy ?? {}), ...L.toy };
  else if (light === 'tag') t.toy = undefined;
  // Unterwasser-/Stimmungs-Angaben bleiben (eigene Farben); Kulisse übernehmen bzw. ersetzen
  const dropBackdrop = L.day && darkTheme(base);
  const baseBuild = dropBackdrop ? null : base.buildBackdrop;
  const baseUpdate = dropBackdrop ? null : base.updateBackdrop;
  if (dropBackdrop) { t.backdrop = 'none'; t.ground = base.ground ?? null; }
  t.buildBackdrop = (sky, bounds, rnd, yBase) => {
    const before = new Set([...sky.group.children, ...sky.domeGroup.children]);
    if (base.backdrop === 'hills' && !baseBuild) sky.buildHills?.(bounds, rnd, yBase);
    baseBuild?.call(t, sky, bounds, rnd, yBase);
    if (L.dim < 1 || L.tint) dimBackdrop(sky, before, L.dim, L.tint);
    if (L.stars) sky.lightStars = starField(sky, rnd, L.stars, { size: 2 });
    if (L.moon) sky.lightMoon = moon(sky, t.sun.dir);
  };
  t.updateBackdrop = (sky, dt, camera) => {
    baseUpdate?.call(t, sky, dt, camera);
    if (sky.lightStars) { sky._lt = (sky._lt ?? 0) + dt; sky.lightStars.material.size = 2 + Math.sin(sky._lt * 1.3) * 0.25; }
  };
  // Sky.fit baut Hügel nur bei backdrop 'hills' selbst; mit eigener buildBackdrop übernimmt die Variante das
  if (base.backdrop === 'hills') t.backdrop = 'hills+';
  return t;
}

/** Unbeleuchtete Kulissen-Teile (MeshBasic, Sprites, Punkte, Linien), die nach `before` dazukamen, dämpfen/tönen. */
function dimBackdrop(sky, before, k, tint) {
  const T = tint !== null && tint !== undefined ? new THREE.Color(tint) : null;
  const seen = new Map();
  for (const root of [...sky.group.children, ...sky.domeGroup.children]) {
    if (before.has(root)) continue;
    root.traverse((o) => {
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      const out = mats.map((m) => {
        if (!(m.isMeshBasicMaterial || m.isSpriteMaterial || m.isPointsMaterial || m.isLineBasicMaterial)) return m;
        if (seen.has(m)) return seen.get(m);
        const c = m.clone();
        sky.track?.(c);
        c.color.multiplyScalar(k);
        if (T) c.color.lerp(T.clone().multiplyScalar(k), 0.25);
        seen.set(m, c);
        return c;
      });
      if (out.length) o.material = Array.isArray(o.material) ? out : out[0];
    });
  }
}

/** Mond (Scheibe mit Schimmer) in der Himmelskuppel, gegenüber der Mondlicht-Richtung nach vorn gelegt. */
function moon(sky, dir) {
  const d = new THREE.Vector3(...dir).normalize();
  const p = new THREE.Vector3(d.x * 0.7, 0.32, -1).normalize().multiplyScalar(300);
  const g = new THREE.Group();
  const disc = new THREE.Mesh(sky.track(new THREE.CircleGeometry(9, 28)), sky.track(new THREE.MeshBasicMaterial({ color: 0xf4f2e4, fog: false, depthWrite: false })));
  disc.position.copy(p); disc.lookAt(0, 0, 0); disc.renderOrder = -9;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(230,236,255,0.7)'); gr.addColorStop(0.3, 'rgba(200,214,255,0.25)'); gr.addColorStop(1, 'rgba(180,200,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const tex = sky.track(new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  const glow = new THREE.Sprite(sky.track(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
  glow.scale.set(60, 60, 1); glow.position.copy(p).multiplyScalar(0.98); glow.renderOrder = -8;
  // Krater (etwas dunklere Flecken)
  const spots = new THREE.Mesh(sky.track(new THREE.CircleGeometry(2.2, 14)), sky.track(new THREE.MeshBasicMaterial({ color: 0xd8d6c8, fog: false, depthWrite: false })));
  spots.position.copy(p).multiplyScalar(0.995).add(new THREE.Vector3(2.5, 2.2, 0)); spots.lookAt(0, 0, 0); spots.renderOrder = -8;
  g.add(disc, glow, spots);
  sky.domeGroup.add(g);
  return g;
}

/** Variante registrieren (einmal) und ihren Namen liefern. Ohne light/filter: Name unverändert. */
export function remixTheme(name, { light = null, filter = null } = {}) {
  if (!light && !filter) return name;
  const key = `${name}@${light ?? 'grund'}${filter === 'schwarzweiss' ? '+sw' : ''}`;
  if (!THEMES[key]) {
    const base = THEMES[name] ?? THEMES.grass;
    THEMES[key] = lightVariant(base, light, filter);
  }
  return key;
}
