// Audio-Fassade: Freischaltung bei der ersten Geste, Effekte, Musik, Stummschaltung.
import { engine } from './AudioEngine.js';
import { sfx, renderSfx, SFX_NAMES, COURSE_SFX, WORLD_SFX } from './sfx.js';
import { music } from './Music.js';

// Test-/Debug-Zugriff auf die Effekte (über window.__audio.engine erreichbar):
// Namen, Kurs-Vertragsnamen (Welt 1 und Welt 2–4), Abspielen und Offline-Rendern zum Vermessen.
engine.effects = { play: sfx, names: SFX_NAMES, course: COURSE_SFX, world: WORLD_SFX, render: renderSfx };

let installed = false;

/** Richtet die Audio-Freischaltung bei der ersten Nutzergeste ein. */
export function installAudioUnlock() {
  if (installed) return;
  installed = true;
  const unlock = () => {
    engine.unlock();
    // Ein paar Frames später nachsehen, ob der Kontext läuft (iOS braucht manchmal zwei Versuche)
    setTimeout(() => { if (engine.ready) music.resumePending(); }, 50);
  };
  for (const ev of ['pointerdown', 'touchstart', 'keydown']) {
    window.addEventListener(ev, unlock, { passive: true });
  }
}

export { engine, sfx, music };
