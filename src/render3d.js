// 3D-Darstellung (Three.js): Schalter und Kameraparameter.
// Die Spiellogik läuft unverändert in 480x270 Weltpixeln (Phaser Arcade); die 3D-Ansicht
// spiegelt Level, Figuren und Effekte in eine Three.js-Szene (1 Einheit = 1 Tile = 16 px).
// ?r3d=0 schaltet auf die alte 2D-Darstellung zurück (Tests, Fehlersuche, schwache Geräte).

// Standard-Darstellung. Solange die 3D-Modelle Platzhalter sind, bleibt die 2D-Fassung Standard;
// ?r3d=1 zeigt die 3D-Ansicht.
const DEFAULT_3D = false;

function pickEnabled() {
  try {
    const p = new URLSearchParams(window.location.search).get('r3d');
    if (p === '0' || p === 'false') return false;
    if (p === '1' || p === 'true') return true;
    if (!DEFAULT_3D) return false;
    // Ohne WebGL keine 3D-Ansicht
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) {
    return false;
  }
}

export const RENDER3D = {
  enabled: pickEnabled(),
  fov: 30,            // vertikaler Öffnungswinkel der Kamera (Grad)
  tilt: 12,           // Kamera blickt um diesen Winkel von oben auf die Spielebene (Grad)
  zoom: 1.0,          // >1 = Kamera weiter weg (mehr Rand sichtbar)
  maxPixelRatio: 2,   // Obergrenze der Gerätepixel-Dichte
  maxPixels: 1.8e6,   // Obergrenze der 3D-Zeichenfläche (Pixel) – Handy-Leistung
  shadows: true,
  shadowMapSize: 2048,
  shadowRadius: 20,   // halbe Breite des Schattenbereichs um die Kamera (Einheiten)
};
