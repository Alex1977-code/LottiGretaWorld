// Kartenbau: aus den Weltdaten (worlds/w<n>.js) entsteht im Level-Objekt der Karte die Insel – mit denselben
// Bausteinen wie die Kurs-Level (island-Optik, water, bridge, stairs, platform, deco …) und den Kartenelementen:
//   Gelände-Blöcke → unsichtbare Begrenzung des begehbaren Bereichs (+ Hecken/Zäune, wo man sie sehen soll)
//   → Wege aus hellen Platten → Eingänge → Schranken → Beerenhaus/Glückshaus → wandernde Gegnergruppe → Meer/Wolken.
// Mehrwelten (Präzisierung Mehrwelten-Karte): map.kit = 'desert' wählt die Wüsten-Geländestile (desert.js) als
// Standard, map.edges die Randdeko ({ hedge: 'hedge'|'adobe'|'pink', fence: 'fence'|'rope'|'chain' }, je Block
// überschreibbar mit edge/fence), map.pathColors die Wegplatten, map.props Requisiten (Palmen, Pyramiden …).
// Welt 3: map.kit = 'snow' wählt die Schnee-Geländestile (snow.js: Schneedecken, Eisfels, zugefrorener See mit
// rutschigem Eis – Block mit ice: true –, Tannenwald, Pastell-Garten, Herbstwiese), Schneewälle/Holzzäune als Ränder
// (edges { hedge: 'snow'|'mint'|'autumn', fence: 'snowfence' }) und Winter-Requisiten (snowPropGeo).
// Welt 4: map.kit = 'canyon' wählt die Canyon-Geländestile (canyon.js: rote Sandstein-Bänder, Tafelberge, Giftwald,
// Bergwiese, Ruinen-Pflaster, Basalt mit glühenden Fugen …), Felsbrocken-Mäuerchen als Rand (edges.hedge 'redrock'),
// Hängebrücken/Felsbögen (segments 'ropebridge'/'rockarch'), Canyon-Requisiten und Seilbahnen (map.cableways,
// bewegte Gondel: out.updaters je Bild, out.own zum Aufräumen).
// Welt 5: map.kit = 'lila' wählt die Geländestile der Lila Strand-Insel (beach5.js: violette Sandbänder, Strand,
// Zirkusplatz, Savanne mit Grashügel, Spukwiese, Minen-Schotter, Torte, Festung, Pflaster, Tempel …), Ränder
// ('violetrock', 'driftwood', 'tropic', 'cream', 'fortwall', 'templewall' – auch als fence), Holzstege
// (segments 'boardwalk') und Strand-/Savannen-/Torten-Requisiten (lilaPropGeo; Registry-Kulisse über lilaPropModel).
// Halloween (Welt 31): map.kit = 'halloween' wählt die Geländestile der Kürbisinsel (halloween.js: Wiese auf violetten
// Erdbändern, Kürbisfeld, Dorfpflaster, Friedhof, Hexenmoor, Burgplatten …), Ränder ('hwstone', 'hwpicket', 'hwiron',
// 'hwhedge'), dunkle Holzstege mit Laternen (segments 'hwbridge'), Requisiten (buildHwProp) und die lebendige Kulisse
// (HwLife: Fledermäuse, Nebelschwaden; Lichter im Material hwglow flackern im Takt der Kartenmusik).
// Welt 6: map.kit = 'sky' wählt die Wolkeninseln (sky6.js: schwebende Inseln mit bunten Erdschichten und felsiger
// Unterseite, Wolkenkragen, Becken, Schnee-, Fabrik-, Dschungel-, Zirkus-Böden …), Ränder ('cloudhedge', 'skyrail',
// 'quay', 'bamboo', 'rocks', 'snowbank'), Brücken (segments 'glasstube', 'cloudbridge', 'redbridge', 'rainbowbridge'),
// Requisiten (skyPropGeo/skyPropModel) und die lebendige Kulisse (SkyLife: Windräder im Takt, Luftschiffchen,
// Wasserfälle, Regenbögen).
// Welt 7: map.kit = 'lava' wählt die Lava-Festung (lava7.js: Basaltschichten mit Tuff-Decke und glühenden Rissen,
// Lavabecken – die Lava zeichnet LavaLife –, Lagune, Tempel-, Rennbahn-, Festungs-, Krater- und Burgböden), Ränder
// ('basaltwall', 'battlement' – Festungsmauern mit Zinnen an den Lavaufern), Brücken (segments 'basaltbridge',
// 'chainbridge', 'causeway', 'drawbridge', dazu 'glasstube' aus sky6.js), Requisiten (lavaPropGeo/lavaPropModel) und die
// lebendige Kulisse (LavaLife: fließende Lava, Lavafälle, Fontänen im Takt, Blasen, Rauch, Knochenflieger, Fahnen, Fackeln).
// Welt 8: map.kit = 'rummel' wählt den Brummbär-Rummelplatz (rummel8.js: Rummel-Pflaster, Parkrasen, nasser Fels, Dünensand,
// Keksboden, Bahnsteig, Gleisbett, Nachtstein mit blau glimmenden Fugen, See, Spukgarten, Manege, Turmfliesen – dazu die
// Lava-Stile aus lava7.js), Ränder ('parkwall', 'parkrail'), Brücken (segments 'rummelbridge' sowie die Welt-7-Brücken und
// 'glasstube'), Requisiten (rummelPropGeo/rummelPropModel) und die lebendige Kulisse (RummelLife: Glühbirnen im Takt, Fahnen,
// Riesenrad, Karussell, Achterbahn, Ballons, nach dem Spielende Feuerwerk; Lava, Rauch, Knochenflieger über LavaLife).
// Reihenfolge wichtig: Höhen für Hecken/Platten werden vom Gelände abgefragt, bevor Wände/Schranken entstehen;
// erst am Ende wird die statische Geometrie verschmolzen (view.finalize).

import * as THREE from 'three';
import { getBlockType } from '../blocks/index.js';
import { islandParts, lin, mixc, colorize, merge, Rnd } from '../blocks/kit.js';
import { roundedBox, SIDE } from '../../three/world/geometry.js';
import { buildWalkGrid, gateSides } from './layout.js';
import { hedgeGeo, fenceGeo, rockCapGeo, berryHouseGeo, itemStandGeo, signGeo, signTextMesh, vcol } from './props.js';
import { EntranceView } from './entrances.js';
import { MapGate } from './gates.js';
import { MapScenery } from './scenery.js';
import { desertGround, adobeWallGeo, ropeFenceGeo, tintHedgeGeo, PINK_HEDGE, propGeo, propShape, cactusGeo, barrelCactusGeo, shrubGeo, desertRockGeo, pinkTreeGeo, sandBlocksGeo, turretGeo, place } from './desert.js';
import { SlotMachine } from './slot.js';
import { bakeModel, propModel } from './bake.js';
import { SNOW_STYLES, snowGround, snowEdgeGeo, scatterSnow, snowPropGeo, snowPropGlow, snowPropShape, buildSnowStairs, buildSnowBridge } from './snow.js';
import { canyonGround, canyonEdgeGeo, scatterCanyon, canyonPropGeo, canyonPropGlow, canyonPropShape, buildRopeBridge, buildRockArch } from './canyon.js';
import { buildCableway } from './decor_w4.js';
import { lilaGround, lilaEdgeGeo, scatterLila, lilaPropGeo, lilaPropGlow, lilaPropShape, lilaPropModel, buildBoardwalk } from './beach5.js';
import { hwGround, hwEdgeGeo, scatterHalloween, buildHwProp, buildHwBridge, hwGlow, HwLife } from './halloween.js';
import { skyGround, skyEdgeGeo, scatterSky, skyPropGeo, skyPropGlow, skyPropShape, skyPropModel, buildSkySegment, skyMats, SkyLife } from './sky6.js';
import { lavaGround, lavaEdgeGeo, scatterLava, lavaPropGeo, lavaPropGlow, lavaPropShape, lavaPropModel, buildLavaSegment, LavaLife } from './lava7.js';
import { rummelGround, rummelEdgeGeo, scatterRummel, rummelPropGeo, rummelPropGlow, rummelPropShape, rummelPropExtraShapes, rummelPropModel, buildRummelSegment, RummelLife } from './rummel8.js';

const DESERT_STYLES = new Set(['desert', 'sandstone', 'dune', 'pink', 'lavarock', 'basin']);

const WALL_T = 0.5;          // Dicke der unsichtbaren Begrenzung
const WALL_TOP = 40;         // so hoch, dass kein Sprung darüber reicht

/**
 * @param {object} level Level der Karte
 * @param {object} map Weltdaten
 * @param {{ entranceInfo(def): { label: string }, gateClosed(gate): boolean }} host
 */
export function buildMap(level, map, host) {
  const out = { grid: null, entrances: new Map(), gates: [], scenery: null, walls: 0, hedges: 0, tiles: 0, house: null, slot: null, updaters: [], own: [] };
  const base = map.base ?? -3;
  const sea = map.sea ?? 0;
  const theme = level.view?.theme;
  if (map.kit === 'halloween') hwGlow(level.view);   // Material hwglow (Lichter im Takt) vor dem ersten addStatic
  if (map.kit === 'sky' || map.kit === 'lava' || map.kit === 'rummel') skyMats(level.view);   // Welt 6 (Welt 7: Glasröhren): Materialien w6glass, w6rainbow vor dem ersten addStatic

  // 1) Gelände
  map.ground.forEach((b, i) => buildGround(level, b, base, theme, i, map));
  // 2) Standard-Bausteine (Wasser, Brücken, Treppen, Plattformen, Deko)
  for (const seg of map.segments ?? []) {
    if (seg.type === 'snowstairs') { buildSnowStairs(level, seg); continue; }   // Welt 3: sparsame Schneestufen (snow.js)
    if (seg.type === 'snowbridge') { buildSnowBridge(level, seg); continue; }   // Welt 3: sparsame Holzbrücke mit Schnee
    if (seg.type === 'ropebridge') { buildRopeBridge(level, seg); continue; }   // Welt 4: Hängebrücke
    if (seg.type === 'rockarch') { buildRockArch(level, seg); continue; }       // Welt 4: Felsbogen
    if (seg.type === 'boardwalk') { buildBoardwalk(level, seg); continue; }     // Welt 5: Holzsteg
    if (seg.type === 'hwbridge') { buildHwBridge(level, seg); continue; }       // Halloween: dunkler Steg mit Laternen
    if (map.kit === 'sky' && buildSkySegment(level, seg)) continue;              // Welt 6: Glasröhre, Wolken-/Regenbogenbrücke …
    if (map.kit === 'lava' && (buildLavaSegment(level, seg) || buildSkySegment(level, seg))) continue;   // Welt 7: Basaltbrücke, Kettensteg, Damm …
    if (map.kit === 'rummel' && (buildRummelSegment(level, seg) || buildLavaSegment(level, seg) || buildSkySegment(level, seg))) continue;   // Welt 8: Rummelsteg, Welt-7-Brücken, Glasröhre
    const build = getBlockType(seg.type);
    if (!build) { console.warn(`[Weltkarte] unbekannter Baustein: ${seg.type}`); continue; }
    try { build(level, seg); } catch (err) { console.error(`[Weltkarte] Baustein ${seg.type} fehlgeschlagen:`, err); }
  }
  const grid = buildWalkGrid(map);
  out.grid = grid;
  if (map.kit === 'desert') scatterDesert(level, map, grid);
  else if (map.kit === 'snow') scatterSnow(level, map, grid);
  else if (map.kit === 'canyon') scatterCanyon(level, map, grid);
  else if (map.kit === 'lila') scatterLila(level, map, grid);
  else if (map.kit === 'halloween') scatterHalloween(level, map, grid);
  else if (map.kit === 'sky') scatterSky(level, map, grid);
  else if (map.kit === 'lava') scatterLava(level, map, grid);
  else if (map.kit === 'rummel') scatterRummel(level, map, grid);
  else scatterDeco(level, map, base, grid);
  buildProps(level, map, grid);
  const bounds = level.computeBounds();

  // 3) begehbarer Bereich → Hecken/Zäune (Optik) und Wände (Kollision)
  const walls = grid.walls();
  const ground = (x, z) => { const h = level.world.raycastDown(x, 80, z, 120); return h ? h.y : null; };
  const groundBlock = (x, z) => level.world.raycastDown(x, 80, z, 120)?.shape?.mapBlock ?? null;
  const edgeParts = { hedge: [], fence: [] };
  for (const w of walls) borderDeco(w, ground, sea, edgeParts, groundBlock, map.edges);
  // Welt 3: niedrige Schneewälle/Zäune ohne Sonnenschatten (spart den Schattenpass auf der dichten Schneeinsel)
  const edgeShadow = map.kit !== 'snow' && map.kit !== 'canyon' && map.kit !== 'lila' && map.kit !== 'halloween' && map.kit !== 'sky' && map.kit !== 'lava' && map.kit !== 'rummel';   // Welt 4, 5, 6, 7, 8, 31 ebenso
  for (const g of edgeParts.hedge) level.view?.addStatic(g, { castShadow: edgeShadow });
  for (const g of edgeParts.fence) level.view?.addStatic(g, { castShadow: edgeShadow });
  out.hedges = edgeParts.hedge.length;

  // 4) Wege aus hellen Platten
  out.tiles = buildPaths(level, map, grid, ground, sea);

  // 5) Meer, Wolken, Nachbarinseln (Inselchen gehen in die statische Geometrie)
  if (level.view) out.scenery = new MapScenery(level.view, map, bounds);

  // 5a) Halloween: Fledermaus-Schwärme, Nebelschwaden (bewegt, je Bild)
  if (map.kit === 'halloween' && level.view) {
    const life = new HwLife(level, map);
    out.updaters.push((dt, t) => life.update(dt, t));
    out.own.push(life);
    out.life = life;
  }

  // 5a') Welt 6: Windräder im Takt, Luftschiffchen, Wasserfälle, Regenbögen (bewegt, je Bild; out.life für Tests)
  if (map.kit === 'sky' && level.view) {
    const life = new SkyLife(level, map);
    out.updaters.push((dt, t) => life.update(dt, t));
    out.own.push(life);
    out.life = life;
  }

  // 5a''') Welt 8: Glühbirnen im Takt, Fahnen, Riesenrad, Karussell, Achterbahn, Ballons, Feuerwerk (nach dem Spielende), Lava …
  if (map.kit === 'rummel' && level.view) {
    const life = new RummelLife(level, map);
    out.updaters.push((dt, t) => life.update(dt, t));
    out.own.push(life);
    out.life = life;
  }

  // 5a'') Welt 7: Lavaflüsse und -seen, Lavafälle, Fontänen im Takt, Blasen, Rauch, Knochenflieger, Fahnen, Fackeln
  if (map.kit === 'lava' && level.view) {
    const life = new LavaLife(level, map);
    out.updaters.push((dt, t) => life.update(dt, t));
    out.own.push(life);
    out.life = life;
  }

  // 5b) Seilbahnen (Welt 4, Kulisse mit fahrender Gondel)
  for (const cw of map.cableways ?? []) {
    const c = buildCableway(level, cw);
    if (c) { out.updaters.push(c.update); out.own.push(c); }
  }

  // 6) Eingänge
  for (const def of map.entrances ?? []) {
    const info = host.entranceInfo(def);
    out.entrances.set(def.id, new EntranceView(level, def, info));
  }

  // 7) Beerenhaus, Glückshaus
  for (const h of map.houses ?? []) {
    if (h.kind === 'glueck') { out.slot = new SlotMachine(level, h); continue; }
    const [x, y, z] = h.pos;
    const g = berryHouseGeo().clone();
    if (h.yaw) g.rotateY(h.yaw + Math.PI / 2);
    g.translate(x, y, z);
    level.view?.addStatic(g, { castShadow: true });
    level.world.add({ type: 'cyl', x, z, r: 1.85, y0: y - 0.5, y1: y + 4.2, tag: 'house' });
    if (h.item) {
      const sg = itemStandGeo().clone();
      sg.translate(h.item[0], h.item[1], h.item[2]);
      level.view?.addStatic(sg, { castShadow: true });
      level.world.add({ type: 'cyl', x: h.item[0], z: h.item[2], r: 0.66, y0: h.item[1] - 0.5, y1: h.item[1] + 0.56, tag: 'itemstand' });
    }
    out.house = h;
  }

  // 7b) Holzschilder
  (map.signs ?? []).forEach((sg, i) => {
    const grp = new THREE.Group();
    const board = new THREE.Mesh(signGeo(), vcol(0.6));
    board.castShadow = true;
    grp.add(board, signTextMesh(sg.text, `${map.id}:${i}`));
    grp.position.set(sg.pos[0], sg.pos[1], sg.pos[2]);
    grp.rotation.y = sg.yaw ?? 0;
    level.view?.add(grp);
    level.world.add({ type: 'cyl', x: sg.pos[0], z: sg.pos[2], r: 0.2, y0: sg.pos[1], y1: sg.pos[1] + 2, tag: 'schild' });
  });

  // 8) Wände (nach allen Höhenabfragen)
  for (const w of walls) {
    let min, max;
    if (w.axis === 'x') {
      const xa = w.side > 0 ? w.x : w.x - WALL_T, xb = w.side > 0 ? w.x + WALL_T : w.x;
      min = [xa, base - 2, w.z0]; max = [xb, WALL_TOP, w.z1];
    } else {
      const za = w.side > 0 ? w.z : w.z - WALL_T, zb = w.side > 0 ? w.z + WALL_T : w.z;
      min = [w.x0, base - 2, za]; max = [w.x1, WALL_TOP, zb];
    }
    level.world.add({ type: 'box', min, max, camIgnore: true, noWallSlide: true, noStep: true, tag: 'kartenrand' });
    out.walls++;
  }

  // 9) Schranken (nur geschlossene bauen; die Szene öffnet frisch freigeschaltete mit Animation)
  for (const gr of gateSides(map, grid)) {
    if (!host.gateClosed(gr)) continue;
    const [x0, z0, x1, z1] = gr.rect;
    const y = ground((x0 + x1) / 2, (z0 + z1) / 2) ?? 1;
    out.gates.push(new MapGate(level, gr, y));
  }

  out.bounds = bounds;
  return out;
}

/** Abschluss: statische Geometrie verschmelzen, Himmel/Hintergrund auslegen. */
export function finalizeMap(level, out) {
  level.view?.finalize(out.bounds);
}

// ------------------------------------------------------------------ Gelände

function buildGround(level, b, base, theme, index, map) {
  const [x0, z0, x1, z1] = b.rect;
  const top = b.top;
  const rnd = new Rnd(0x51ab + index * 977);
  level.world.add({ type: 'box', min: [x0, base, z0], max: [x1, top, z1], tag: b.walk ? 'karte' : 'gelaende', mapBlock: b, ice: !!b.ice });
  if (!theme) return;
  if (map.kit === 'rummel') {
    // Welt 8: Brummbär-Rummelplatz (Deckschichten ohne Schattenwurf, Fugen leuchtend, See und Pfützen glänzend)
    for (const g of rummelGround({ ...b, style: b.style ?? 'plaza' }, base, theme, rnd, map)) {
      const mat = g.userData?.material, ns = g.userData?.noShadow;
      level.view.addStatic(g, mat || ns ? { material: mat, castShadow: !ns, tile: g.userData.tile } : undefined);
    }
    return;
  }
  if (map.kit === 'lava') {
    // Welt 7: Lava-Festung (Deckschichten ohne Schattenwurf, Risse leuchtend, Lagune glänzend)
    for (const g of lavaGround({ ...b, style: b.style ?? 'ash' }, base, theme, rnd, map)) {
      const mat = g.userData?.material, ns = g.userData?.noShadow;
      level.view.addStatic(g, mat || ns ? { material: mat, castShadow: !ns, tile: g.userData.tile } : undefined);
    }
    return;
  }
  if (map.kit === 'sky') {
    // Welt 6: schwebende Inseln (Deckschichten ohne Schattenwurf, Wasser glänzend, Kristalle leuchtend)
    for (const g of skyGround({ ...b, style: b.style ?? 'meadow' }, base, theme, rnd, map)) {
      const mat = g.userData?.material, ns = g.userData?.noShadow;
      level.view.addStatic(g, mat || ns ? { material: mat, castShadow: !ns, tile: g.userData.tile } : undefined);
    }
    return;
  }
  if (map.kit === 'halloween') {
    // Halloween: Stile der Kürbisinsel (flache Deckschichten ohne Schattenwurf)
    for (const g of hwGround({ ...b, style: b.style ?? 'hwgrass' }, base, theme, rnd)) {
      const mat = g.userData?.material, ns = g.userData?.noShadow;
      level.view.addStatic(g, mat || ns ? { material: mat, castShadow: !ns } : undefined);
    }
    return;
  }
  if (map.kit === 'lila') {
    // Welt 5: Stile der Lila Strand-Insel (flache Deckschichten ohne Schattenwurf, Leuchtendes über userData.material)
    for (const g of lilaGround({ ...b, style: b.style ?? 'lila' }, base, theme, rnd)) {
      const mat = g.userData?.material, ns = g.userData?.noShadow;
      level.view.addStatic(g, mat || ns ? { material: mat, castShadow: !ns } : undefined);
    }
    return;
  }
  if (map.kit === 'canyon') {
    // Welt 4: Canyon-Stile (flache Deckschichten ohne Schattenwurf, glänzende/leuchtende Teile über userData.material)
    for (const g of canyonGround({ ...b, style: b.style ?? 'canyon' }, base, theme, rnd)) {
      const mat = g.userData?.material, ns = g.userData?.noShadow;
      level.view.addStatic(g, mat || ns ? { material: mat, castShadow: !ns } : undefined);
    }
    return;
  }
  const style = b.style ?? (map.kit === 'desert' ? 'desert' : map.kit === 'snow' ? 'snow' : 'grass');
  if (map.kit === 'snow' || SNOW_STYLES.has(style)) {
    // Welt 3: Eisflächen (userData.material) glänzen über das Material 'stone'
    for (const g of snowGround({ ...b, style }, base, theme, rnd)) {
      const mat = g.userData?.material;
      level.view.addStatic(g, mat ? { material: mat, castShadow: false } : g.userData?.noShadow ? { castShadow: false } : undefined);
    }
    return;
  }
  if (map.kit === 'desert' || DESERT_STYLES.has(style)) {
    for (const g of desertGround({ ...b, style }, base, theme, rnd)) level.view.addStatic(g);
    return;
  }
  if (style === 'rock') {
    const h = top - base;
    const g = roundedBox(x1 - x0, h, z1 - z0, 0.35, SIDE.ALL, SIDE.NY, 2);
    const dark = lin(0x6e6676), light = lin(0xb4acb9), band = lin(0x8a8292);
    const rock = colorize(g, (p, n, o) => {
      const yy = p.y + h / 2;
      const k = (Math.floor(yy / 0.9) & 1) ? 0.15 : 0;
      mixc(dark, light, Math.max(0, n.y) * 0.6 + 0.25 + k, o);
      if (Math.abs(n.y) < 0.5 && (Math.floor(yy / 0.9) % 3 === 0)) mixc(o, band, 0.5, o);
    });
    rock.translate((x0 + x1) / 2, base + h / 2, (z0 + z1) / 2);
    level.view.addStatic(rock);
    const cap = rockCapGeo(x1 - x0, z1 - z0, 7 + index);
    cap.translate((x0 + x1) / 2, top, (z0 + z1) / 2);
    level.view.addStatic(cap);
    return;
  }
  const opts = { under: 0, rnd, top: style === 'pond' || style === 'sand' ? 'sand' : 'grass' };
  for (const g of islandParts(x0, base, z0, x1, top, z1, theme, opts)) level.view.addStatic(g);
}

/** Bäume, Büsche und Blumen auf nicht begehbaren Grasblöcken (deterministisch). */
function scatterDeco(level, map, base, grid) {
  const deco = getBlockType('deco');
  if (!deco) return;
  const items = [];
  const light = [];
  map.ground.forEach((b, i) => {
    if (b.walk || b.style === 'rock' || b.style === 'pond' || b.style === 'sand' || b.noDeco) return;
    const [cx, cz] = [(b.rect[0] + b.rect[2]) / 2, (b.rect[1] + b.rect[3]) / 2];
    if (grid.isWalk(cx, cz)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const rnd = new Rnd(0xdec0 + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d;
    const meadow = b.style === 'meadow' || b.top <= 1.5;
    const nTrees = meadow ? Math.floor(area / 80) : Math.max(1, Math.floor(area / 38));
    for (let k = 0, tries = 0; k < nTrees && tries < nTrees * 12; tries++) {
      const x = rnd.real(x0 + 1.6, x1 - 1.6), z = rnd.real(z0 + 1.6, z1 - 1.6);
      if (tooClose(x, z, 3.0)) continue;
      pts.push([x, z]);
      light.push(lightTree(x, b.top, z, rnd.real(3.8, 5.6), rnd));
      k++;
    }
    const nBush = Math.floor(area / (meadow ? 36 : 70));
    for (let k = 0, tries = 0; k < nBush && tries < nBush * 10; tries++) {
      const x = rnd.real(x0 + 1, x1 - 1), z = rnd.real(z0 + 1, z1 - 1);
      if (tooClose(x, z, 1.8)) continue;
      pts.push([x, z]);
      light.push(lightBush(x, b.top, z, rnd.real(0.6, 0.95), rnd));
      k++;
    }
    const nFl = meadow ? Math.floor(area / 40) : 0;
    for (let k = 0; k < nFl; k++) {
      const x = rnd.real(x0 + 1, x1 - 1), z = rnd.real(z0 + 1, z1 - 1);
      if (tooClose(x, z, 1.2)) continue;
      items.push({ kind: 'flowers', pos: [x, b.top, z], size: [1.6, 1.6], n: 5 });
    }
  });
  if (items.length) deco(level, { type: 'deco', items });
  for (const g of light) level.view?.addStatic(g, { castShadow: true });
  void base;
}

/**
 * Wüsten-Streudeko auf nicht begehbaren Blöcken (deterministisch): Kakteen, Kugelkakteen, Trockenbüsche, Felsen; auf
 * rosa Gras Blütenbäume, auf grünem Gras Bäume und Büsche. Lavafels, Becken, Teich und noDeco bleiben frei.
 */
function scatterDesert(level, map, grid) {
  const parts = [];
  map.ground.forEach((b, i) => {
    const style = b.style ?? 'desert';
    if (b.walk || b.noDeco || ['lavarock', 'basin', 'pond', 'sand'].includes(style)) return;
    const [x0, z0, x1, z1] = b.rect;
    const w = x1 - x0, d = z1 - z0;
    if (w < 2.5 || d < 2.5) return;
    const [cx, cz] = [(x0 + x1) / 2, (z0 + z1) / 2];
    if (grid.isWalk(cx, cz)) return;
    const rnd = new Rnd(0xd5e7 + i * 131);
    const pts = [];
    const tooClose = (x, z, r) => pts.some((p) => Math.hypot(p[0] - x, p[1] - z) < r);
    const area = w * d;
    // Düne: Deko nur am Fuß (die Kuppe bleibt glatt)
    const inner = (x, z) => style !== 'dune' || Math.abs(x - cx) / (w / 2) > 0.62 || Math.abs(z - cz) / (d / 2) > 0.62;
    const y = b.top;
    const put = (n, minD, make) => {
      for (let k = 0, tries = 0; k < n && tries < n * 12; tries++) {
        const x = rnd.real(x0 + 1.2, x1 - 1.2), z = rnd.real(z0 + 1.2, z1 - 1.2);
        if (tooClose(x, z, minD) || !inner(x, z)) continue;
        pts.push([x, z]);
        const g = make(rnd);
        if (g) parts.push(place(g, x, y, z, rnd.real(0, Math.PI * 2)));
        k++;
      }
    };
    if (style === 'pink') {
      put(Math.max(1, Math.floor(area / 40)), 3, (r) => pinkTreeGeo(r.real(3.4, 4.8), r.int(1, 999)));
      put(Math.floor(area / 50), 1.6, (r) => shrubGeo(r.real(0.4, 0.6), r.int(1, 999)));
      return;
    }
    if (style === 'grass' || style === 'meadow') {
      put(Math.max(1, Math.floor(area / 45)), 3, (r) => lightTree(0, 0, 0, r.real(3.8, 5.4), r));
      put(Math.floor(area / 60), 1.8, (r) => lightBush(0, 0, 0, r.real(0.6, 0.9), r));
      return;
    }
    const k = style === 'sandstone' ? 0.5 : 1;
    put(Math.max(1, Math.floor((area / 100) * k)), 2.6, (r) => cactusGeo(r.real(1.6, 2.8), r.int(1, 999)));
    put(Math.floor((area / 150) * k), 1.6, () => barrelCactusGeo(0.4));
    put(Math.floor((area / 80) * k), 1.8, (r) => (r.frac() < 0.5 ? shrubGeo(r.real(0.4, 0.6), r.int(1, 999)) : desertRockGeo(r.real(0.5, 1.0), r.int(1, 999))));
  });
  for (const g of parts) level.view?.addStatic(g, { castShadow: true });
}

/** Requisiten aus map.props: { kind, pos, yaw?, size?, … } (desert.js propGeo); auf begehbarem Gelände mit Kollision. */
function buildProps(level, map, grid) {
  const add = (g, o) => level.view.addStatic(g, o);
  (map.props ?? []).forEach((it, i) => {
    if (map.kit === 'halloween') { buildHwProp(level, map, grid, it, i); return; }   // Halloween: halloween.js
    // Modell aus der Registry (gleiche Optik wie in den Leveln), sonst eigene sparsame Geometrie
    const pm = level.view && it.model !== false ? (propModel(it) ?? (map.kit === 'lila' ? lilaPropModel(it) : map.kit === 'sky' ? skyPropModel(it) : map.kit === 'lava' ? lavaPropModel(it) : map.kit === 'rummel' ? (rummelPropModel(it) ?? lavaPropModel(it)) : null)) : null;
    // Welt 6: eingebackene Registry-Requisiten in kompakte Kacheln je 16-m-Feld mit Fern-Ausblendung (wie Halloween)
    // (Welt 7: die leichten Basalt-/Felsmodelle gehen in die Kachel ihrer Insel – keine eigenen Zeichenaufrufe je Feld)
    const addPm = map.kit === 'sky' ? (g, o) => add(g, { ...o, tile: `w6p:${Math.floor(it.pos[0] / 16)}|${Math.floor(it.pos[2] / 16)}`, lod: true })
      : map.kit === 'lava' ? (g, o) => add(g, o.material === 'glow' ? { ...o, tile: 'w7:leuchten' } : o)
        // Welt 8: Registry-Requisiten (Buden, Dünen, Statuen …) in kompakte Kacheln je 24-m-Feld mit Fern-Ausblendung
        : map.kit === 'rummel' ? (g, o) => add(g, { ...o, tile: `w8p:${Math.floor(it.pos[0] / 24)}|${Math.floor(it.pos[2] / 24)}:${o.material ?? 'world'}`, lod: true }) : add;
    const baked = pm ? bakeModel(addPm, pm[0], pm[1], it.pos, (it.yaw ?? 0) + pm[2], pm[3]) : null;
    if (baked && it.kind === 'tank') add(place(turretGeo(it.size ?? 1, (it.color ?? 'oliv') === 'oliv'), it.pos[0], it.pos[1] + 1.6 * (it.size ?? 1), it.pos[2], it.yaw ?? 0), { castShadow: true });
    if (it.kind === 'sandstack') {
      // Stapel aus 1-m-Sandblöcken zum Hüpfen (Kollision je Stapel, Optik: Modell 'sandblock')
      const n = it.n ?? 1, [x, y, z] = it.pos;
      level.world.add({ type: 'box', min: [x - 0.5, y, z - 0.5], max: [x + 0.5, y + n, z + 0.5], tag: 'sandblock' });
      if (level.view) for (let k = 0; k < n; k++) if (!bakeModel(add, 'sandblock', {}, [x, y + k, z], (it.yaw ?? 0) + k * 0.05)) add(place(sandBlocksGeo(1, k + 1), x, y + k, z, it.yaw ?? 0), { castShadow: true });
      return;
    }
    if (!baked && level.view && it.kind === 'sandblocks') bakeSandblocks(add, it);
    else if (!baked) {
      const g = level.view ? ((map.kit === 'lava' ? lavaPropGeo(it, 0x7a11 + i * 37) : map.kit === 'rummel' ? rummelPropGeo(it, 0x7a11 + i * 37) : null) ?? propGeo(it, 0x7a11 + i * 37) ?? snowPropGeo(it, 0x7a11 + i * 37) ?? canyonPropGeo(it, 0x7a11 + i * 37) ?? lilaPropGeo(it, 0x7a11 + i * 37) ?? skyPropGeo(it, 0x7a11 + i * 37)) : null;
      if (g) level.view.addStatic(place(g, it.pos[0], it.pos[1], it.pos[2], it.yaw ?? 0), { castShadow: it.shadow !== false, material: it.material });
      // Welt 3: Fenster, Laternen, Lichterkugeln (helle Teile ohne Schattenwurf; teilen die Kachel der Wegplatten)
      const gl = level.view ? (snowPropGlow(it) ?? (map.kit === 'canyon' ? canyonPropGlow(it) : map.kit === 'lila' ? lilaPropGlow(it) : map.kit === 'sky' ? skyPropGlow(it) : map.kit === 'lava' ? lavaPropGlow(it) : map.kit === 'rummel' ? rummelPropGlow(it) : null)) : null;
      if (gl) level.view.addStatic(place(gl, it.pos[0], it.pos[1], it.pos[2], it.yaw ?? 0), map.kit === 'lava' ? { material: 'glow', castShadow: false, tile: 'w7:leuchten' } : map.kit === 'rummel' ? { material: 'glow', castShadow: false, tile: 'w8:leuchten' } : { castShadow: false });
    }
    if (it.solid === false) return;
    if (map.kit === 'rummel') for (const sh of rummelPropExtraShapes(it)) level.world.add(sh);   // Welt 8: Säulen des Rummel-Tors
    if (it.solid || grid.isWalk(it.pos[0], it.pos[2])) {
      const sh = (map.kit === 'lava' ? lavaPropShape(it) : map.kit === 'rummel' ? rummelPropShape(it) : null) ?? propShape(it) ?? snowPropShape(it) ?? canyonPropShape(it) ?? lilaPropShape(it) ?? skyPropShape(it);
      if (sh) level.world.add(sh);
    }
  });
}

/** Stapel aus Sandblöcken (Modell 'sandblock' der Registry, 1 m), Lage wie desert.sandBlocksGeo. */
const SB_SPOTS = [[0, 0, 0], [1.02, 0, 0.1], [0.5, 1.0, 0.05], [-1.0, 0, -0.2], [-0.5, 1, -0.1], [0, 2, 0]];
function bakeSandblocks(add, it) {
  const yaw = it.yaw ?? 0, c = Math.cos(yaw), s = Math.sin(yaw);
  let ok = false;
  for (let k = 0; k < Math.min(it.n ?? 3, SB_SPOTS.length); k++) {
    const [x, y, z] = SB_SPOTS[k];
    const r = bakeModel(add, 'sandblock', {}, [it.pos[0] + x * c + z * s, it.pos[1] + y, it.pos[2] - x * s + z * c], yaw + k * 0.07);
    ok = ok || !!r;
  }
  if (!ok) add(place(propGeo(it, 3), it.pos[0], it.pos[1], it.pos[2], yaw), { castShadow: true });
}

// Leichte Bäume/Büsche für die Streu-Deko (weniger Dreiecke als die Deko-Bausteine, gleiche Anmutung)
const CROWNS = [[0xffcf7a, 0xf58f3a, 0xc45f22], [0xffa38a, 0xef5f44, 0xb33a2a], [0xfff0a6, 0xf6c54a, 0xc98d22], [0xb9f286, 0x6cc74d, 0x3d8f32], [0xa6ec7a, 0x58b947, 0x2f7d2a]];
function ball(r, x, y, z, pal, ws = 8, hs = 6) {
  const g = new THREE.SphereGeometry(r, ws, hs);
  g.translate(x, y, z);
  const L = lin(pal[0]), M = lin(pal[1]), D = lin(pal[2]);
  return colorize(g, (p, n, o) => (n.y >= 0 ? mixc(M, L, Math.min(1, n.y / 0.9), o) : mixc(M, D, Math.min(1, -n.y / 0.9), o)));
}
function lightTree(x, y, z, h, rnd) {
  const parts = [];
  const trunkH = h * 0.42, rT = 0.09 * h;
  const trunk = new THREE.CylinderGeometry(rT * 0.75, rT, trunkH, 6, 1, true);
  trunk.translate(x, y + trunkH / 2, z);
  const td = lin(0x5c3a22), tl = lin(0x8a5a36);
  parts.push(colorize(trunk, (p, n, o) => mixc(td, tl, (p.y - y) / trunkH, o)));
  const pal = CROWNS[Math.floor(rnd.frac() * CROWNS.length)];
  const R = h * 0.26;
  for (const [dx, dy, dz, r] of [[0, trunkH + R * 1.1, 0, R * 1.15], [-R * 0.75, trunkH + R * 0.55, R * 0.25, R * 0.85], [R * 0.7, trunkH + R * 0.7, -R * 0.2, R * 0.9]]) {
    parts.push(ball(r, x + dx, y + dy, z + dz, pal));
  }
  return merge(parts);
}
function lightBush(x, y, z, r, rnd) {
  const pal = CROWNS[3 + Math.floor(rnd.frac() * 2)];
  return merge([[0, 0.55, 0, 1], [-0.7, 0.4, 0.2, 0.75], [0.65, 0.42, -0.15, 0.7]].map(([dx, dy, dz, k]) => ball(r * k, x + dx * r, y + dy * r, z + dz * r, pal, 7, 5)));
}

// ------------------------------------------------------------------ Ränder: Hecken und Zäune

/**
 * Entlang einer Randkante je Meter prüfen, was dahinter liegt:
 *   gleich hoch oder bis 3,5 m höher → Hecke auf der Außenseite (sichtbare Grenze)
 *   tiefer (Land, kein Meer)          → weißer Zaun an der Kante
 *   Meer oder hohe Klippe             → nichts (natürliche Grenze)
 */
function borderDeco(w, ground, sea, out, groundBlock, edges = {}) {
  const len = w.axis === 'x' ? w.z1 - w.z0 : w.x1 - w.x0;
  const n = Math.max(1, Math.round(len));
  const step = len / n;
  const cls = [];
  for (let i = 0; i < n; i++) {
    const u = (w.axis === 'x' ? w.z0 : w.x0) + (i + 0.5) * step;
    const [ix, iz, ox, oz] = w.axis === 'x'
      ? [w.x - w.side * 0.25, u, w.x + w.side * 0.75, u]
      : [u, w.z - w.side * 0.25, u, w.z + w.side * 0.75];
    const hin = ground(ix, iz), hout = ground(ox, oz);
    let c = 'none', y = 0, st = '';
    if (hin !== null && hout !== null && hout > sea + 0.3 && !groundBlock(ox, oz)?.noEdge) {
      const dh = hout - hin;
      if (dh > -0.45 && dh < 3.6) { c = 'hedge'; y = hout; st = groundBlock(ox, oz)?.edge ?? groundBlock(ix, iz)?.edge ?? edges.hedge ?? 'hedge'; }
      else if (dh <= -0.45) { c = 'fence'; y = hin; st = groundBlock(ix, iz)?.fence ?? edges.fence ?? 'fence'; }
    }
    cls.push({ c, y, u, st });
  }
  // gleiche Abschnitte zusammenfassen
  let i = 0;
  while (i < n) {
    const c = cls[i].c, y = cls[i].y;
    let j = i;
    const st = cls[i].st;
    while (j + 1 < n && cls[j + 1].c === c && cls[j + 1].st === st && Math.abs(cls[j + 1].y - y) < 0.05) j++;
    if (c !== 'none') {
      const a = (w.axis === 'x' ? w.z0 : w.x0) + i * step, b = (w.axis === 'x' ? w.z0 : w.x0) + (j + 1) * step;
      const L = b - a, mid = (a + b) / 2;
      let g;
      if (c === 'hedge') {
        const seed = Math.floor(mid * 7 + 13) >>> 0;
        g = st === 'adobe' ? adobeWallGeo(L + 0.1, seed) : st === 'pink' ? tintHedgeGeo(L + 0.2, PINK_HEDGE, seed) : snowEdgeGeo(st, L, seed) ?? canyonEdgeGeo(st, L, seed) ?? lilaEdgeGeo(st, L, seed) ?? hwEdgeGeo(st, L, seed) ?? skyEdgeGeo(st, L, seed) ?? lavaEdgeGeo(st, L, seed) ?? rummelEdgeGeo(st, L, seed) ?? hedgeGeo(L + 0.2, 1.1, 0.9, seed);
        const off = w.side * (st === 'adobe' ? 0.35 : 0.45);
        if (w.axis === 'x') { g.rotateY(Math.PI / 2); g.translate(w.x + off, y, mid); }
        else g.translate(mid, y, w.z + off);
      } else {
        g = st === 'rope' || st === 'chain' ? ropeFenceGeo(L, st === 'chain') : snowEdgeGeo(st, L, 1) ?? lilaEdgeGeo(st, L, 1) ?? hwEdgeGeo(st, L, Math.floor(mid * 7 + 13) >>> 0) ?? skyEdgeGeo(st, L, Math.floor(mid * 7 + 13) >>> 0) ?? lavaEdgeGeo(st, L, Math.floor(mid * 7 + 13) >>> 0) ?? rummelEdgeGeo(st, L, Math.floor(mid * 7 + 13) >>> 0) ?? fenceGeo(L);
        const off = w.side * 0.12;
        if (w.axis === 'x') { g.rotateY(Math.PI / 2); g.translate(w.x + off, y, mid); }
        else g.translate(mid, y, w.z + off);
      }
      out[c].push(g);
    }
    i = j + 1;
  }
}

// ------------------------------------------------------------------ Wege

const SKIP_TAGS = new Set(['bridge', 'stairs', 'ramp', 'platform', 'water']);

/** Platten (1 m) entlang der Weg-Polylinien, 2 m breit; nur auf ebenem, begehbarem Gelände. */
function buildPaths(level, map, grid, ground, sea) {
  const tiles = new Map();
  for (const pl of map.paths ?? []) {
    for (let k = 0; k < pl.length - 1; k++) {
      const [ax, az] = pl[k], [bx, bz] = pl[k + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) * 4));
      for (let s = 0; s <= n; s++) {
        const x = ax + ((bx - ax) * s) / n, z = az + ((bz - az) * s) / n;
        for (let i = Math.floor(x - 0.99); i <= Math.floor(x + 0.99); i++) {
          for (let j = Math.floor(z - 0.99); j <= Math.floor(z + 0.99); j++) tiles.set(`${i},${j}`, [i, j]);
        }
      }
    }
  }
  if (!level.view) return tiles.size;
  const rnd = new Rnd(0x9a7e);
  const pc = map.pathColors ?? [0xf6e7c1, 0xead6a6, 0xd9c28e];
  const a = lin(pc[0]), b2 = lin(pc[1]), edge = lin(pc[2]);
  const parts = [];
  let count = 0;
  for (const [i, j] of tiles.values()) {
    const cx = i + 0.5, cz = j + 0.5;
    // ganz auf begehbarem Gelände und eben?
    const corners = [[i + 0.1, j + 0.1], [i + 0.9, j + 0.1], [i + 0.1, j + 0.9], [i + 0.9, j + 0.9]];
    if (!corners.every(([x, z]) => grid.isWalk(x, z))) continue;
    const hit = level.world.raycastDown(cx, 80, cz, 120);
    if (!hit || hit.y < sea + 0.3 || SKIP_TAGS.has(hit.shape.tag) || hit.shape.tag === 'podium') continue;
    const hs = corners.map(([x, z]) => ground(x, z));
    if (hs.some((h) => h === null || Math.abs(h - hit.y) > 0.02)) continue;
    const base = mixc(a, b2, rnd.frac(), [0, 0, 0]);
    const box = new THREE.BoxGeometry(0.9, 0.1, 0.9);
    if (map.kit === 'snow' || map.kit === 'lila' || map.kit === 'halloween' || map.kit === 'sky' || map.kit === 'lava' || map.kit === 'rummel') box.setIndex([...box.index.array.slice(0, 18), ...box.index.array.slice(24)]);   // Welt 3/5: ohne Unterseite
    const g = colorize(box, (p, n, o) => { if (n.y > 0.6) { o[0] = base[0]; o[1] = base[1]; o[2] = base[2]; } else mixc(base, edge, 0.7, o); });
    g.translate(cx, hit.y + 0.01, cz);
    parts.push(g);
    count++;
  }
  for (const g of parts) level.view.addStatic(g, { castShadow: false });
  return count;
}

