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
//
// Wunsch-Kostüm (Präzisierung „Figuren Bonuswelten: Sternenglanz-Kostüm“, additiv): Kostüme, die man sich verdient und selbst
// an- und auszieht (WISH_OUTFITS: 'stern' – Belohnung aus S-2), sind eine eigene Ebene unter der Szene: currentOutfit() liefert
// die Verkleidung der Szene, sonst den Wunsch. Die Halloween-Welt (Szene setzt 'halloween') hat damit Vorrang; der URL-Schalter
// (?outfit=stern | ?outfit=halloween | ?outfit=0) wie bisher vor allem.
//   setOutfitWish(kind | fn) Wunsch setzen ('stern' | null) oder als lebende Quelle binden (fn() → Name; die Kurs-Weltkarte bindet
//                            den Spielstand: courseSave.data.outfit, nur freigeschaltete Kostüme aus courseSave.data.outfits)
//   outfitWish()             gültiger Wunsch ('stern' | null)

export const OUTFITS = new Set(['halloween', 'stern']);
/** Kostüme, die die Spielerin selbst wählt (Spielstand) – gelten überall dort, wo die Szene keine Verkleidung setzt. */
export const WISH_OUTFITS = new Set(['stern']);
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
let wish = null;   // Wert oder Funktion (lebende Quelle, z. B. der Spielstand)

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
  return URL_OUTFIT !== undefined ? URL_OUTFIT : current ?? outfitWish();
}

/** Wunsch-Kostüm setzen: Name ('stern' | null) oder Funktion, die ihn je Aufruf liefert (lebende Quelle). */
export function setOutfitWish(kind) {
  wish = typeof kind === 'function' ? kind : WISH_OUTFITS.has(kind) ? kind : null;
  return currentOutfit();
}

/** Gültiges Wunsch-Kostüm ('stern' | null). */
export function outfitWish() {
  let k = wish;
  if (typeof k === 'function') { try { k = k(); } catch { k = null; } }
  return WISH_OUTFITS.has(k) ? k : null;
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
