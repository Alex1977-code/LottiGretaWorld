// Render-Skalierung: Die Spiellogik rechnet in 480x270 „Weltpixeln“, gezeichnet wird mit
// S-facher Auflösung (glatte, hochauflösende Grafik statt Pixelraster). S wird einmalig beim
// Start aus Bildschirmgröße und Pixeldichte bestimmt (2 oder 3).
import { GAME } from './config.js';

function pickScale() {
  try {
    // ?scale=1|2|3 erzwingt die Skalierung (Tests, Fehlersuche)
    const forced = parseInt(new URLSearchParams(window.location.search).get('scale') ?? '', 10);
    if (forced >= 1 && forced <= 4) return forced;
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth * dpr, h = window.innerHeight * dpr;
    const fit = Math.min(w / GAME.width, h / GAME.height);
    return Math.max(2, Math.min(3, Math.round(fit)));
  } catch (_) {
    return 2;
  }
}

export const RENDER = {
  scale: pickScale(),
};

/**
 * Elemente mit scrollFactor 0 in einer gezoomten Kamera: Phaser zoomt um die Bildmitte, deshalb
 * müssen bildschirmfeste Objekte um diesen Versatz verschoben werden, damit (0,0) oben links liegt.
 */
export const FIXED_OFFSET = {
  x: (GAME.width * (RENDER.scale - 1)) / 2,
  y: (GAME.height * (RENDER.scale - 1)) / 2,
};

/** Kehrwert der Skalierung: Anzeige-Skalierung für Sprites, deren Textur S-fach aufgelöst ist. */
export const Z = 1 / RENDER.scale;

/** Setzt die Anzeige-Skalierung eines Sprites/Images auf Weltgröße (Textur ist S-fach). */
export function fit(obj, factor = 1) {
  return obj.setScale(factor * Z);
}

/**
 * Arcade-Hitbox in Weltpixeln setzen (Textur ist S-fach aufgelöst, Sprite mit Z skaliert).
 * Ohne ox/oy wird die Box mittig an der Unterkante des Frames ausgerichtet.
 */
export function setBodyBox(obj, w, h, ox, oy) {
  const S = RENDER.scale;
  const fw = obj.width, fh = obj.height; // Frame-Größe in Texturpixeln
  const offX = ox === undefined ? (fw - w * S) / 2 : ox * S;
  const offY = oy === undefined ? fh - h * S : oy * S;
  obj.body.setSize(w * S, h * S);
  obj.body.setOffset(offX, offY);
  return obj;
}

/** Breite/Höhe eines Frames in Weltpixeln. */
export const worldW = (obj) => obj.width / RENDER.scale;
export const worldH = (obj) => obj.height / RENDER.scale;

/** Kamera einer Overlay-Szene auf Render-Skalierung zoomen und auf die 480x270-Fläche zentrieren. */
export function setupUiCamera(scene) {
  const cam = scene.cameras.main;
  cam.setZoom(RENDER.scale);
  cam.centerOn(GAME.width / 2, GAME.height / 2);
  return cam;
}
