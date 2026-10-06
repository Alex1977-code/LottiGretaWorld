# Pip & Pflaume

2D-Jump'n'Run im Geist klassischer 16-Bit-Plattformer, optimiert für Smartphones im
Querformat. Läuft im Browser, installierbar als PWA. Alle Grafiken und Sounds werden
prozedural per Code erzeugt – keine externen Assets.

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server (http://localhost:5173)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm test           # Headless-Test (Chromium): Konsole, Bewegung, Screenshots → tests/out/
```

## Steuerung (PC)

| Taste          | Aktion                                              |
| -------------- | --------------------------------------------------- |
| ← →            | Laufen                                              |
| Leertaste / ↑  | Springen (kurz tippen = kleiner Sprung)             |
| Leertaste halten (in der Luft) | Blätterschirm: Gleiten                |
| ↓ (beim Gleiten) | Sturzflug; loslassen → Aufschwung nach oben       |
| X              | Aktion (Feuer/Stampfen – nur auf Pflaume)           |
| D              | Debug-Modus (Hitboxen, FPS, Zustand)                |
| R              | Zurück zum Start                                    |

## Struktur

```
src/
  main.js            Phaser-Konfiguration, Start
  config.js          Alle Physik-/Spielwerte zentral
  scenes/            Boot, Play
  entities/          Pip (Bewegung), später Pflaume, Gegner
  systems/           Eingabe, Kamera, Effekte, Debug, Haptik
  levels/            ASCII→Tiled-Konverter, Levels
  gfx/               Prozedurale Texturen (Pixel-Art als Strings, Tiles, Hintergrund)
  audio/             Chiptune-Synth (Etappe 7)
tests/run.mjs        Headless-Smoke-Test mit Playwright
```

Die Pixel-Art-Frames in `src/gfx/pipFrames.js` können später 1:1 durch ein echtes
Spritesheet (gleicher Texture-Key `pip`, gleiche Frame-Namen) ersetzt werden.
