// Abspann-Ablauf (Präzisierung Motor und Bausteine Welt 8): kleine Schnittstelle ohne schwere Abhängigkeiten, damit
// entities/gimmick.js (Aktion { credits }) und CourseScene sie nutzen können, ohne die Abspann-Szene zu laden.
//
//   CREDITS_KEY                     'Credits' (Phaser-Szene, src/course/CreditsScene.js)
//   requestCredits(level, when)     Abspann anfordern: when 'nach-ziel' (Standard: „Weiter“ im Ergebnis-Bildschirm führt in den
//                                   Abspann statt zur Karte) | 'sofort' (Level endet, der Abspann beginnt gleich)
//   creditsWanted(scene)            soll diese Kurs-Szene nach dem Ziel in den Abspann? (LEVEL.credits oder angefordert)
//   startCreditsFrom(scene, from)   Abspann aus einer Szene starten (Kurs-Overlays werden beendet): scene.start('Credits',
//                                   { from })
// Level-Daten: LEVEL.credits = true (z. B. 8-Burg) wirkt wie { credits: true } beim Levelstart.

export const CREDITS_KEY = 'Credits';

export function creditsWanted(scene) {
  return !!(scene?.level?.creditsWanted || scene?.levelData?.credits);
}

export function startCreditsFrom(scene, from = null) {
  if (!scene?.scene) return false;
  let has = false;
  try { has = !!scene.scene.get(CREDITS_KEY); } catch (_) { has = false; }
  if (!has) return false;
  for (const k of ['CoursePause', 'CourseResult', 'CourseUI']) { try { scene.scene.stop(k); } catch (_) { /* nicht aktiv */ } }
  scene.scene.start(CREDITS_KEY, { from: from ?? scene.levelId ?? null });
  return true;
}

export function requestCredits(level, when = 'nach-ziel') {
  if (!level) return;
  level.creditsWanted = when;
  if (when === 'sofort') {
    const sc = level.scene;
    if (sc) sc.finished = true;
    startCreditsFrom(sc, sc?.levelId);
  }
}
