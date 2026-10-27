// Verkleidung der Figuren (Vertrag docs/KURS-ARCHITEKTUR.md „Präzisierung (Figuren Halloween): Verkleidung“).
//
// Ein Schalter für alle Figuren: Die Szene setzt die Verkleidung ihrer Welt (setOutfit), alle Figuren-Avatare
// (HeroAvatar, PflaumeAvatar) und das Hasenmodell `bunny_small`/`kruemel` (Krümel) lesen sie je Bild (currentOutfit) und
// ziehen ihr Kostüm-Zubehör an bzw. aus – auch Avatare, die erst später entstehen (Figurwechsel, Spiegelfrucht-Klone,
// Reittier, Floß). Einzelne Avatare lassen sich zusätzlich festlegen: avatar.setOutfit('halloween' | null) (Vorrang vor
// der Szene), avatar.setOutfit('auto') folgt wieder der Szene.
//
//   setOutfit(kind, owner)   Verkleidung der Szene setzen ('halloween' | null); owner = setzende Szene (für clearOutfit)
//   clearOutfit(owner)       beim Beenden der Szene: zurück auf null – nur, wenn owner sie zuletzt gesetzt hat
//   currentOutfit()          gültige Verkleidung (URL-Schalter ?outfit=halloween | ?outfit=0 hat Vorrang)
//   outfitForLevel(id, data) Verkleidung eines Kurs-Levels: data.outfit (auch null), sonst Präfix 'H-', Welt 31,
//                            LEVEL.halloween: true (wie die Halloween-Optik der Spuke) oder ein Halloween-Testlevel (0-20,
//                            0-21, 0-22) → 'halloween'
//   outfitForMap(map)        Verkleidung einer Kurs-Weltkarte: map.outfit (auch null), sonst Welt 31 → 'halloween'
//
// Außerhalb der Halloween-Welt bleibt alles exakt wie bisher (Zubehör entsteht erst beim ersten Anziehen und hängt nur im
// Szenengraphen, solange es getragen wird).

export const OUTFITS = new Set(['halloween']);
/** Interne Weltnummer der Halloween-Welt „Kürbisinsel“ (31. Oktober) und ihr Level-Präfix. */
export const HALLOWEEN_WORLD = 31;
export const HALLOWEEN_PREFIX = 'H-';
/** Testlevel der Halloween-Bausteine (Gegner, Gimmicks, Boss) – tragen die Verkleidung wie die Welt. */
export const HALLOWEEN_TEST_LEVELS = new Set(['0-20', '0-21', '0-22']);

const norm = (k) => (OUTFITS.has(k) ? k : null);

/** URL-Schalter: ?outfit=halloween erzwingt die Verkleidung überall, ?outfit=0 (bzw. none/off) schaltet sie überall ab. */
const URL_OUTFIT = (() => {
  try {
    const v = new URLSearchParams(window.location.search).get('outfit');
    if (v === null) return undefined;
    return OUTFITS.has(v) ? v : null;
  } catch { return undefined; }
})();

let current = null;
let owner = null;

export function setOutfit(kind, by = null) {
  current = norm(kind);
  owner = by;
  return currentOutfit();
}

export function clearOutfit(by = null) {
  if (owner !== by) return;
  current = null;
  owner = null;
}

export function currentOutfit() {
  return URL_OUTFIT !== undefined ? URL_OUTFIT : current;
}

export function outfitForLevel(id, data = null) {
  if (data && data.outfit !== undefined) return norm(data.outfit);
  const s = String(id ?? '');
  if (s.startsWith(HALLOWEEN_PREFIX) || HALLOWEEN_TEST_LEVELS.has(s) || data?.world === HALLOWEEN_WORLD || data?.halloween === true) return 'halloween';
  return null;
}

export function outfitForMap(map) {
  if (!map) return null;
  if (map.outfit !== undefined) return norm(map.outfit);
  return map.world === HALLOWEEN_WORLD ? 'halloween' : null;
}
