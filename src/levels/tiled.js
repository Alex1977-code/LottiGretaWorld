// Hilfsfunktionen: ASCII-Level → Tiled-kompatibles JSON.
// Damit lassen sich Levels im Code schnell skizzieren; echte Tiled-Dateien
// (gleiches Format) können später 1:1 geladen werden.

import { TILE_SIZE, TILE_INDEX, TILE_NAMES, groundIndex, EDGE } from '../gfx/tiles.js';

// ASCII-Legende
//  '#' Boden (Autotile)   '=' Plattform (einseitig)   'B' Steinblock
//  'P' Startpunkt Spieler  '.' leer
export const LEGEND = {
  GROUND: '#',
  PLATFORM: '=',
  BRICK: 'B',
  PLAYER: 'P',
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
        gid = groundIndex(mask) + 1;
      } else if (ch === LEGEND.PLATFORM) {
        gid = TILE_INDEX.platform + 1;
      } else if (ch === LEGEND.BRICK) {
        gid = TILE_INDEX.brick + 1 + ((x + y) % 2);
      } else if (ch === LEGEND.PLAYER) {
        objects.push({
          id: objId++, name: 'player', type: 'player',
          x: x * TILE_SIZE, y: (y + 1) * TILE_SIZE, width: 0, height: 0, point: true, visible: true, rotation: 0,
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
