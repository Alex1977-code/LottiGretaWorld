// Lädt die Kits und Kulissen der Bonuswelt-Karten (melden sich in bonuskit.BONUS_KITS an): Welt Pilz (pilz10.js,
// decor_pilz.js), Welt Blume (blume11.js, decor_blume.js), Welt Krone (krone12.js, decor_krone.js). MapBuilder, scenery.js und
// entrances.js fragen nur die Tabelle (bonuskit.bonusKit(map), bonusEdgeGeo, decorateBonus, bonusNeighborParts).
import './pilz10.js';
import './decor_pilz.js';
import './blume11.js';
import './decor_blume.js';
import './krone12.js';
import './decor_krone.js';

export { BONUS_KITS, bonusKit, bonusEdgeGeo, decorateBonus, bonusNeighborParts } from './bonuskit.js';
