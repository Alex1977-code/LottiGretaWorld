// Hilfsfunktionen: ASCII-Level → Tiled-kompatibles JSON.
// Damit lassen sich Levels im Code schnell skizzieren; echte Tiled-Dateien
// (gleiches Format) können später 1:1 geladen werden.

import { TILE_SIZE, TILE_INDEX, TILE_NAMES, groundIndex, EDGE } from '../gfx/tiles.js';

// ASCII-Legende
//  '#' Boden (Autotile)   '=' Plattform (einseitig)   'B' Steinblock
//  'P' Startpunkt Spieler  '.' leer
//  'k' Laufkäfer  'm' hüpfender Pilz  'C' Checkpoint
//  'F' Pflaume  'R' rote Beere  'U' blaue Beere  'Y' gelbe Beere
//  'o' große Münze  'K' Schlüssel  'G' Tor (geheimer Ausgang)  'X' Zielfahne  '^' Dornen
//  Zier (ohne Kollision): '"' Grasbüschel  '*' Blumen  '&' Pilze  '%' Stein
export const LEGEND = {
  GROUND: '#',
  PLATFORM: '=',
  BRICK: 'B',
  PLAYER: 'P',
  WALKER: 'k',
  HOPPER: 'm',
  CHECKPOINT: 'C',
  PFLAUME: 'F',
  BERRY_RED: 'R',
  BERRY_BLUE: 'U',
  BERRY_YELLOW: 'Y',
  COIN: 'o',
  KEY: 'K',
  GATE: 'G',
  FLAG: 'X',
  THORNS: '^',
  DECO_GRASS: '"',
  DECO_FLOWERS: '*',
  DECO_MUSHROOM: '&',
  DECO_STONE: '%',
};

const DECO_TILES = {
  [LEGEND.DECO_GRASS]: TILE_INDEX.decoGrass,
  [LEGEND.DECO_FLOWERS]: TILE_INDEX.decoFlowers,
  [LEGEND.DECO_MUSHROOM]: TILE_INDEX.decoMushroom,
  [LEGEND.DECO_STONE]: TILE_INDEX.decoStone,
};

// Zeichen → Objekt (name/type); Position ist jeweils die Unterkante des Tiles
const OBJECT_CHARS = {
  [LEGEND.PLAYER]: { name: 'player', type: 'player' },
  [LEGEND.WALKER]: { name: 'walker', type: 'enemy' },
  [LEGEND.HOPPER]: { name: 'hopper', type: 'enemy' },
  [LEGEND.CHECKPOINT]: { name: 'checkpoint', type: 'checkpoint' },
  [LEGEND.PFLAUME]: { name: 'pflaume', type: 'mount' },
  [LEGEND.BERRY_RED]: { name: 'red', type: 'berry' },
  [LEGEND.BERRY_BLUE]: { name: 'blue', type: 'berry' },
  [LEGEND.BERRY_YELLOW]: { name: 'yellow', type: 'berry' },
  [LEGEND.COIN]: { name: 'coin', type: 'coin' },
  [LEGEND.KEY]: { name: 'key', type: 'key' },
  [LEGEND.GATE]: { name: 'gate', type: 'gate' },
  [LEGEND.FLAG]: { name: 'flag', type: 'flag' },
  [LEGEND.THORNS]: { name: 'thorns', type: 'thorns' },
};

/**
 * Wandelt ASCII-Zeilen in Tiled-JSON um.
 * @param {string[]} rows Zeilen gleicher Länge
 * @param {object} opts { name }
 */
export function asciiToTiled(rows, opts = {}) {
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const get = (x, y) => (y < 0 || y >= height || x < 0 || x >= width ? '#' : (rows[y][x] ?? '.'));
  const isGround = (x, y) => get(x, y) === LEGEND.GROUND;

  const data = new Array(width * height).fill(0);
  const objects = [];
  let objId = 1;
  let coinIndex = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = get(x, y);
      let gid = 0;
      if (ch === LEGEND.GROUND) {
        let mask = 0;
        if (!isGround(x, y - 1)) mask |= EDGE.TOP;
        if (!isGround(x + 1, y)) mask |= EDGE.RIGHT;
        if (!isGround(x, y + 1)) mask |= EDGE.BOTTOM;
        if (!isGround(x - 1, y)) mask |= EDGE.LEFT;
        // Höhlenboden: oben frei, aber innerhalb von 4 Zeilen darüber liegt wieder Boden (Decke)
        const isCave = mask === EDGE.TOP && [1, 2, 3, 4].some((d) => y - d >= 0 && rows[y - d][x] === LEGEND.GROUND);
        gid = (isCave ? TILE_INDEX.caveFloor : groundIndex(mask)) + 1;
      } else if (ch === LEGEND.PLATFORM) {
        gid = TILE_INDEX.platform + 1;
      } else if (DECO_TILES[ch] !== undefined) {
        gid = DECO_TILES[ch] + 1;
      } else if (ch === LEGEND.BRICK) {
        gid = TILE_INDEX.brick + 1 + ((x + y) % 2);
      } else if (OBJECT_CHARS[ch]) {
        const def = OBJECT_CHARS[ch];
        const props = [];
        if (def.type === 'coin') props.push({ name: 'index', type: 'int', value: coinIndex++ });
        objects.push({
          id: objId++, name: def.name, type: def.type,
          x: x * TILE_SIZE, y: (y + 1) * TILE_SIZE, width: 0, height: 0, point: true, visible: true, rotation: 0,
          properties: props,
        });
      }
      data[y * width + x] = gid;
    }
  }

  return {
    type: 'map', version: '1.10', tiledversion: '1.10.2', orientation: 'orthogonal', renderorder: 'right-down',
    infinite: false, compressionlevel: -1, nextlayerid: 3, nextobjectid: objId,
    width, height, tilewidth: TILE_SIZE, tileheight: TILE_SIZE,
    properties: [{ name: 'name', type: 'string', value: opts.name ?? 'Level' }],
    tilesets: [{ firstgid: 1, name: 'tiles', tilewidth: TILE_SIZE, tileheight: TILE_SIZE, tilecount: TILE_NAMES.length, columns: TILE_NAMES.length, image: 'tiles', imagewidth: TILE_NAMES.length * TILE_SIZE, imageheight: TILE_SIZE, margin: 0, spacing: 0 }],
    layers: [
      { id: 1, name: 'ground', type: 'tilelayer', width, height, x: 0, y: 0, opacity: 1, visible: true, data },
      { id: 2, name: 'objects', type: 'objectgroup', draworder: 'topdown', opacity: 1, visible: true, x: 0, y: 0, objects },
    ],
  };
}
