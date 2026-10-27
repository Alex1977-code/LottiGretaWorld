// Themen der Kurs-Level: Himmel, Nebel, Licht, Gelände-Farben. LEVEL.theme wählt eines; Bausteine lesen
// die Farben über `level.view.theme` (so färbt dasselbe Level-Datum in einem anderen Thema um).
// Farben sRGB-Hex. Präzisierung (Motor): neue Themen = neuer Eintrag hier (z. B. circus, river, highway).
import { CIRCUS } from './themes_circus.js';
import { HIGHWAY } from './theme_highway.js';

const GRASS = {
  label: 'Wiese',
  sky: [[1, 0x2b8de8], [0.45, 0x47aefb], [0.15, 0x8cd3ff], [0.03, 0xcbeeff], [0, 0xe6f7ff], [-0.1, 0xc6e0f2], [-1, 0xa6c6dc]],
  background: 0xcbe9fb,
  fog: { color: 0xd3ecfb, near: 70, far: 260 },
  hemi: { sky: 0xc4e6ff, ground: 0x7fae58, intensity: 1.3 },
  sun: { color: 0xfff0d2, intensity: 2.7, dir: [-0.42, 1, 0.5] },
  shadows: true,
  sunDisc: true,
  clouds: true,
  backdrop: 'hills',
  ground: { color: 0x7fcf5a, y: -36 },
  // Gelände
  grassTop: 0x72dd47, grassTop2: 0x66d13f, grassRim: 0xa6f070, grassSide: 0x48b234,
  dirt: 0xd59253, dirtDeep: 0x9e6534, rock: 0x8f8a96, rockDeep: 0x5d5866,
  checker: false,
  stone: 0xe9ebf2, stoneDark: 0xb7bac6,
  wood: 0xf6f4ef, woodDark: 0xc9ccd6,          // weiße Holzbrücken
  climb: 0xf0d9a8, climbDark: 0xc9a46a,         // Kletterwand (Krallen)
  water: 0x3fb4ff, waterDeep: 0x1c6fd1,
  lava: 0xff6a1a,
  lights: [],
};

export const THEMES = {
  grass: GRASS,
  circus: { ...GRASS, ...CIRCUS },   // Zirkuszelt (1-5), Werte in themes_circus.js
  highway: HIGHWAY,
  // Übungsplatz: heller, Raster auf den Grasdecken (1 m) zum Abschätzen von Sprungweiten
  test: {
    ...GRASS,
    label: 'Übungsplatz',
    sky: [[1, 0x3a9cf0], [0.45, 0x5cc0ff], [0.15, 0x9fe0ff], [0.03, 0xd8f4ff], [0, 0xeefaff], [-0.1, 0xd0ecf6], [-1, 0xb0d4e6]],
    background: 0xd8f1fc,
    fog: { color: 0xdcf1fb, near: 70, far: 260 },
    grassTop: 0x7ee052, grassTop2: 0x62c93c, grassRim: 0xb2f584,
    dirt: 0xe0a465, dirtDeep: 0xa9713e,
    checker: true,
  },
  // Höhle (vorbereitet): dunkel, Nebel nah, schwaches Licht, Laternen (Punktlichter) und Licht an der Figur
  cave: {
    ...GRASS,
    label: 'Höhle',
    sky: [[1, 0x0d0a12], [0, 0x1a1420], [-1, 0x0a080d]],
    background: 0x140f18,
    fog: { color: 0x140f18, near: 14, far: 70 },
    hemi: { sky: 0x6d5f92, ground: 0x2a1e18, intensity: 0.55 },
    sun: { color: 0xffd8a0, intensity: 0.5, dir: [-0.3, 1, 0.4] },
    shadows: false,
    sunDisc: false,
    clouds: false,
    backdrop: 'none',
    ground: null,
    grassTop: 0x6e8f5a, grassTop2: 0x5f7f4e, grassRim: 0x86a96e, grassSide: 0x4d6b40,
    dirt: 0x7d5d4c, dirtDeep: 0x4f3a30,
    lights: [],
    playerLight: { color: 0xffc27a, intensity: 26, distance: 14 },
    lanternLight: { color: 0xffb44a, intensity: 22, distance: 11 },
  },
};

// Weitere Themen in eigenen Dateien (je eine Registrierzeile)
import { RIVER_THEME } from './theme_river.js'; THEMES.river = RIVER_THEME;
import { DIORAMA_THEME } from './theme_diorama.js'; THEMES.diorama = DIORAMA_THEME;
// Welt 2 (Bausteine Welt 2): nur eintragen, wenn das Thema nicht schon anders registriert ist
import { DESERT_THEME } from './theme_desert.js'; THEMES.desert ??= DESERT_THEME;
import { SPACE_THEME } from './theme_space.js'; THEMES.space ??= SPACE_THEME;
import { SHADOW_THEME } from './theme_shadow.js'; THEMES.shadow ??= SHADOW_THEME;
import { PINKGRASS_THEME } from './theme_pinkgrass.js'; THEMES.pinkgrass ??= PINKGRASS_THEME;
import { LAVA_THEME } from './theme_lava.js'; THEMES.lava ??= LAVA_THEME;
import { HOUSE_THEME } from './theme_house.js'; THEMES.house ??= HOUSE_THEME;
// Welt 3 (Bausteine Welt 3): nur eintragen, wenn das Thema nicht schon anders registriert ist
import { SNOW_THEME } from './theme_snow.js'; THEMES.snow ??= SNOW_THEME;
import { SKYWAY_THEME } from './theme_skyway.js'; THEMES.skyway ??= SKYWAY_THEME;
import { GHOST_THEME } from './theme_ghost.js'; THEMES.ghost ??= GHOST_THEME;
import { PLAZA_THEME } from './theme_plaza.js'; THEMES.plaza ??= PLAZA_THEME;
import { FORTRESS_THEME } from './theme_fortress.js'; THEMES.fortress ??= FORTRESS_THEME;
import { WATER_THEME } from './theme_water.js'; THEMES.water ??= WATER_THEME;
import { RACE_THEME } from './theme_race.js'; THEMES.race ??= RACE_THEME;
import { AUTUMN_THEME } from './theme_autumn.js'; THEMES.autumn ??= AUTUMN_THEME;
import { TRAIN_THEME } from './theme_train.js'; THEMES.train ??= TRAIN_THEME;
// Welt 4 (Bausteine Welt 4): nur eintragen, wenn das Thema nicht schon anders registriert ist
import { CANYON_THEME } from './theme_canyon.js'; THEMES.canyon ??= CANYON_THEME;
import { POISON_THEME } from './theme_poison.js'; THEMES.poison ??= POISON_THEME;
import { BEEP_THEME } from './theme_beep.js'; THEMES.beep ??= BEEP_THEME;
import { BOUNCE_THEME } from './theme_bounce.js'; THEMES.bounce ??= BOUNCE_THEME;
import { RUINS_THEME } from './theme_ruins.js'; THEMES.ruins ??= RUINS_THEME;
import { LAVACASTLE_THEME } from './theme_lavacastle.js'; THEMES.lavacastle ??= LAVACASTLE_THEME;
// Welt 5 (Motor und Bausteine Welt 5): nur eintragen, wenn das Thema nicht schon anders registriert ist
import { BEACH_THEME } from './theme_beach.js'; THEMES.beach ??= BEACH_THEME;
import { BLUELAVA_THEME } from './theme_bluelava.js'; THEMES.bluelava ??= BLUELAVA_THEME;
import { SAVANNA_THEME } from './theme_savanna.js'; THEMES.savanna ??= SAVANNA_THEME;
import { MINE_THEME } from './theme_mine.js'; THEMES.mine ??= MINE_THEME;
import { CAKE_THEME } from './theme_cake.js'; THEMES.cake ??= CAKE_THEME;
import { SNEAK_THEME } from './theme_sneak.js'; THEMES.sneak ??= SNEAK_THEME;
import { TEMPLE_THEME } from './theme_temple.js'; THEMES.temple ??= TEMPLE_THEME;
// Halloween-Welt „Kürbisinsel“ (Motor und Bausteine Halloween): nur eintragen, wenn das Thema nicht schon anders registriert ist
import { PUMPKIN_THEME } from './theme_pumpkin.js'; THEMES.pumpkin ??= PUMPKIN_THEME;
import { PUMPKIN_NIGHT_THEME } from './theme_pumpkin_night.js'; THEMES.pumpkin_night ??= PUMPKIN_NIGHT_THEME;
import { CANDYVILLAGE_THEME } from './theme_candyvillage.js'; THEMES.candyvillage ??= CANDYVILLAGE_THEME;
import { GRAVEYARD_THEME } from './theme_graveyard.js'; THEMES.graveyard ??= GRAVEYARD_THEME;
import { WITCHTOWER_THEME } from './theme_witchtower.js'; THEMES.witchtower ??= WITCHTOWER_THEME;
import { CASTLE_NIGHT_THEME } from './theme_castle_night.js'; THEMES.castle_night ??= CASTLE_NIGHT_THEME;

export function getTheme(name) { return THEMES[name] ?? THEMES.grass; }
