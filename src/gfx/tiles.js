// Tile-Zeichnung (16x16) im SNES-Stil. Boden-Tiles werden als "Autotile" nach freiliegenden
// Kanten zusammengesetzt: Index 0..15 = Bitmaske (oben=1, rechts=2, unten=4, links=8).
// Danach folgen Spezial-Tiles (Plattform, Steinblöcke) und Zier-Tiles. Tiled-GID = Index + 1.
//
// Zeichenweise: Pixel-Strings mit eigener Palette (TP). Bausteine (Erde, Grasnarbe, Kanten,
// Ecken) werden übereinandergelegt; ' ' lässt den Untergrund stehen, '.' macht transparent.

export const TILE_SIZE = 16;

export const EDGE = { TOP: 1, RIGHT: 2, BOTTOM: 4, LEFT: 8 };

// Namen in Index-Reihenfolge. 0-15: ground_<maske>
export const TILE_NAMES = [];
for (let m = 0; m < 16; m++) TILE_NAMES.push(`ground_${m}`);
TILE_NAMES.push('platform');       // 16: einseitig begehbare Plattform (Holzsteg)
TILE_NAMES.push('brick');          // 17: fester Steinblock
TILE_NAMES.push('brick_alt');      // 18: Steinblock Variante (Riss)
// Zier-Tiles (ohne Kollision, frei platzierbar – werden bisher von keinem Level benutzt)
TILE_NAMES.push('deco_grass');     // 19: Grasbüschel
TILE_NAMES.push('deco_flowers');   // 20: Blümchen im Gras
TILE_NAMES.push('deco_mushroom');  // 21: zwei Pilze
TILE_NAMES.push('deco_stone');     // 22: Stein mit Moos
TILE_NAMES.push('cave_floor');     // 23: Höhlenboden (Erde ohne Gras, mit Kontur oben)

export const TILE_INDEX = {
  ground: 0,
  platform: 16,
  brick: 17,
  brickAlt: 18,
  decoGrass: 19,
  decoFlowers: 20,
  decoMushroom: 21,
  decoStone: 22,
  caveFloor: 23,
};

/** Liefert den Tile-Index für Boden mit gegebener Kantenmaske. */
export function groundIndex(mask) {
  return TILE_INDEX.ground + (mask & 15);
}

// Tile-Palette (eigene Buchstaben, unabhängig von palette.js)
const TP = {
  '.': null,        // transparent
  ' ': undefined,   // Untergrund stehen lassen (nur in Overlays)
  'O': '#2a1a12',   // Kontur
  'K': '#2f5230',   // Gras Schatten
  'G': '#4f7d24',   // Gras
  'L': '#74a832',   // Gras hell
  'H': '#a9d65a',   // Gras Glanz
  'd': '#4a2a1a',   // Erde Schatten
  'e': '#6b3f1c',   // Erde dunkel
  'D': '#8d5a2b',   // Erde
  'f': '#b57a3c',   // Erde hell
  'F': '#d9a96a',   // Erde Glanz
  'r': '#c2383f',   // Herbstlaub rot
  'o': '#d9742a',   // Herbstlaub orange
  'y': '#f2c230',   // Herbstlaub gelb
  's': '#5f626b',   // Steinchen dunkel (Zier-Stein)
  'S': '#8c8f99',   // Steinchen hell (Zier-Stein)
  't': '#6e5444',   // Erd-Steinchen dunkel
  'T': '#a89070',   // Erd-Steinchen hell
  // Holz (Plattform)
  'v': '#3a2214',   // Holz Kontur
  'w': '#6b3f1c',   // Holz dunkel
  'u': '#8d5a2b',   // Holz Maserung
  'W': '#b57a3c',   // Holz
  'x': '#d9a96a',   // Holz hell
  'X': '#f0d2a0',   // Holz Glanz
  // Stein (Block)
  '1': '#2c2f36',   // Stein Kontur
  '2': '#5f626b',   // Stein Schatten
  '3': '#8c8f99',   // Stein
  '4': '#b3b6bf',   // Stein hell
  '5': '#e0e2e8',   // Stein Glanz
  'm': '#4f7d24',   // Moos
  'M': '#74a832',   // Moos hell
  // Pilze (Zier)
  'p': '#c2383f',   // Pilzhut
  'P': '#e85a5a',   // Pilzhut hell
  'q': '#7a1f2b',   // Pilzhut Schatten
  'n': '#f3e2c4',   // Pilzstiel
  'N': '#c9b68f',   // Pilzstiel Schatten
  'Q': '#fff0dc',   // Punkte / Blüten weiß
  'Y': '#f2c230',   // Blüte gelb
  'R': '#e85a5a',   // Blüte rot
};

/** Zeichnet ein Raster aus Strings. ' ' überspringt, '.' löscht (transparent), Buchstaben setzen Farbe. */
function blit(ctx, rows, ox, oy) {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === ' ') continue;
      if (ch === '.') { ctx.clearRect(ox + x, oy + y, 1, 1); continue; }
      const c = TP[ch];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

// ---------------------------------------------------------------- Boden

// Erde innen: ruhig, damit große Flächen nicht flimmern (ein Steinchen, Schichtlinie, Krümel)
const DIRT = [
  'DDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDD',
  'DDDfDDDDDDDDDeDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDDDDDTtDDDDDD',
  'DDDDDDDDtdDDDDDD',
  'DDDDDDDDDDDDDDDD',
  'DeeDDDDDDDDDeeeD',
  'DDDeeDDDDDDeeDDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDDDDDDDDDDDDD',
  'DDDDDDfDDDDDDDDD',
  'DDDDDDDDDDDDDDDD',
  'DDeDDDDDDDDDDDDD',
  'DDDDDDDDDDDeDDDD',
  'DDDDDDDDDDDDDDDD',
];

// Grasnarbe (oben): unregelmäßige Kante mit Kerben, Halmen, Laub, weicher Übergang zur Erde
const GRASS = [
  'HLLGLHLLGLLHLGLH',
  'LLLLLLHLLLLLLLLL',
  'LGLLGLLLLGLLLGLL',
  'GGLGGGLGGGGLGGGL',
  'GGGGGGKGGGGKGGGG',
  'KGKKGKdKKGKKdKKG',
  ' K  d K   K  d  ',
  '    f       f   ',
];
// Herbstblätter (als Overlay auf der Grasnarbe)
const LEAVES = [
  '                ',
  '   r       o    ',
  '           y    ',
  '        y       ',
];

// Linke/rechte Kante: Kontur + Lichtkante (links) bzw. Schattenkante (rechts)
const EDGE_LEFT = Array(16).fill('Of');
const EDGE_RIGHT = Array(16).fill('eO');
// Untere Kante: Schatten + Kontur, kleine Erdbrocken hängen herunter
const EDGE_BOTTOM = [
  '  d   d    d  d ',
  'dddddddddddddddd',
  'OOOOOOOOOOOOOOOO',
];

// Ecken (Overlays): Grasnarbe schwingt an der Kante abgerundet herunter
const CORNER_TL = [
  '..OLH ',
  '.OLLL ',
  'OGLL  ',
  'OGGL  ',
  'OKG   ',
  'OKK   ',
  'Of    ',
  'Of    ',
];
const CORNER_TR = [
  ' HLO..',
  ' LLGO.',
  '  LGGO',
  '  GGKO',
  '   KKO',
  '   KKO',
  '    eO',
  '    eO',
];
const CORNER_BL = [
  'Of  ',
  '.Od ',
  '..OO',
];
const CORNER_BR = [
  '  eO',
  ' dO.',
  'OO..',
];

/** Boden: Erde mit Grasnarbe oben, Kontur an freiliegenden Kanten, runde Ecken. */
function drawGround(ctx, ox, oy, mask) {
  const top = mask & EDGE.TOP, right = mask & EDGE.RIGHT, bottom = mask & EDGE.BOTTOM, left = mask & EDGE.LEFT;
  blit(ctx, DIRT, ox, oy);
  if (top) {
    blit(ctx, GRASS, ox, oy);
    blit(ctx, LEAVES, ox, oy);
  }
  if (bottom) blit(ctx, EDGE_BOTTOM, ox, oy + 13);
  if (left) blit(ctx, EDGE_LEFT, ox, oy);
  if (right) blit(ctx, EDGE_RIGHT, ox + 14, oy);
  if (top && left) blit(ctx, CORNER_TL, ox, oy);
  if (top && right) blit(ctx, CORNER_TR, ox + 10, oy);
  if (bottom && left) blit(ctx, CORNER_BL, ox, oy + 13);
  if (bottom && right) blit(ctx, CORNER_BR, ox + 12, oy + 13);
}

// Höhlenboden: Erde mit dunkler Kontur und Schattenstreifen statt Grasnarbe
const CAVE_TOP = [
  'OOOOOOOOOOOOOOOO',
  'eeedeeeeedeeeeed',
  'DeDDDeDDDDeDDeDD',
  '  t      t      ',
];

// ---------------------------------------------------------------- Plattform

// Holzsteg: helle Oberkante, Maserung, dunkle Unterkante, Nägel; darunter Pfosten mit Streben
const PLATFORM = [
  'XXXXXXXXXXXXXXXx',
  'xvxxxxxxxxxxxxvW',
  'WWWWuWWWWWWWuWWW',
  'WuWWWWWuWWWWWWWu',
  'wwwwwwwwwwwwwwww',
  'vvvvvvvvvvvvvvvv',
  '....v.vWw.v.....',
  '.....vvWwv......',
  '......vWw.......',
  '......vWw.......',
  '......vvv.......',
  '................',
  '................',
  '................',
  '................',
  '................',
];

// ---------------------------------------------------------------- Steinblock

// Gefaster Block: Kontur, Lichtkante oben links, Schattenkante unten rechts, runde Ecken
const BRICK = [
  '.11111111111111.',
  '1555555555555421',
  '1544444444444321',
  '1543333333333321',
  '1543333343333321',
  '1543333333333321',
  '1543333333332321',
  '1543333333333321',
  '1543343333333321',
  '1543333333333321',
  '1543333333333321',
  '1543333332333321',
  '1543333333333321',
  '1543222222222221',
  '1422222222222221',
  '.11111111111111.',
];
const BRICK_ALT = [
  '.11111111111111.',
  '1555555555555421',
  '1544444444444321',
  '1543333333333321',
  '1543333333323321',
  '1543333333233321',
  '1543333332333321',
  '1543333333333321',
  '1543333333333321',
  '154333m333333321',
  '154mM3m333333321',
  '154mmmm333333321',
  '154mmm3333333321',
  '154m222222222221',
  '1422222222222221',
  '.11111111111111.',
];

// ---------------------------------------------------------------- Zier-Tiles

const DECO_GRASS = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......L.........',
  '..L...L....L....',
  '..L..LH..L.L..L.',
  '..LL.LL..L.LL.L.',
  '...L.G.L.G.G..L.',
  '.L.G.G.L.G.G.LG.',
  '.L.GG..GGG.G.G..',
  '..KG.G.GG.GK.G..',
  '..KG.KGK..KGKK..',
  '...KKK.K..K.K...',
];
const DECO_FLOWERS = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '...Q.......QQ...',
  '..QYQ.....QRQ...',
  '...Q..R....Q....',
  '...G.QYQ.......G',
  '..LG..G..QQ..G.G',
  '..LG.LG..YQ.LG.G',
  '...G.G...GG.G.G.',
  '.L.G.G.L.G..G.G.',
  '.LKGGK.LKG.KGKG.',
  '..KK.K..KK.KK.K.',
];
const DECO_MUSHROOM = [
  '................',
  '................',
  '................',
  '................',
  '......qPPq......',
  '.....qPQPpq.....',
  '....qPPppppq....',
  '....qpQpppPq....',
  '....qqqqqqqq....',
  '......nNn..qPq..',
  '......nNn.qPQpq.',
  '......nNn.qpppq.',
  '......nNn.qqqqq.',
  '...L..nNn...nN..',
  '..LG.KnNnK..nN.L',
  '..KK.KKKKK.KKK.K',
];
const DECO_STONE = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '......1111......',
  '....11M44511....',
  '...1Mm4433331...',
  '...1mm333332231.',
  '..1m3333332221..',
  '..13333322222s1.',
  '..13332222222s1.',
  '.L1222222222221L',
  '.LG111111111111G',
  '..KK...K.K..KKK.',
];

/** Zeichnet ein Tile anhand seines Namens an Position (ox, oy). */
export function drawTile(ctx, name, ox, oy) {
  if (name.startsWith('ground_')) {
    drawGround(ctx, ox, oy, parseInt(name.slice(7), 10));
  } else if (name === 'platform') {
    blit(ctx, PLATFORM, ox, oy);
  } else if (name === 'brick') {
    blit(ctx, BRICK, ox, oy);
  } else if (name === 'brick_alt') {
    blit(ctx, BRICK_ALT, ox, oy);
  } else if (name === 'deco_grass') {
    blit(ctx, DECO_GRASS, ox, oy);
  } else if (name === 'deco_flowers') {
    blit(ctx, DECO_FLOWERS, ox, oy);
  } else if (name === 'deco_mushroom') {
    blit(ctx, DECO_MUSHROOM, ox, oy);
  } else if (name === 'deco_stone') {
    blit(ctx, DECO_STONE, ox, oy);
  } else if (name === 'cave_floor') {
    blit(ctx, DIRT, ox, oy);
    blit(ctx, CAVE_TOP, ox, oy);
  }
}
