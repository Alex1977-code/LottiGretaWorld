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

## Steuerung (Touch, Querformat)

- **Linke Bildschirmhälfte:** virtueller Analog-Stick – erscheint dort, wo der Daumen aufsetzt,
  wandert mit, wenn man über den Rand hinauszieht.
- **Rechte Hälfte:** Tippen = Springen, Halten = Gleiten (Blätterschirm),
  beim Gleiten nach unten wischen = Sturzflug, Finger heben oder nach oben wischen = Aufschwung.
- **Runder Knopf am rechten Rand:** Aktion (Feuer/Stampfen – nur auf Pflaume).
- Im Hochformat erscheint ein Dreh-Hinweis und das Spiel pausiert.

## PWA

`public/manifest.webmanifest` + `public/sw.js` (Service Worker, offline-fähig, Cache pro Build).
Icons liegen in `public/icons/` und werden mit `npm run icons` aus der Pip-Grafik erzeugt.

## Struktur

```
src/
  main.js            Phaser-Konfiguration, Start
  config.js          Alle Physik-/Spielwerte zentral
  scenes/            Boot, Play, UI (Touch-Steuerung, HUD)
  entities/          Pip (Bewegung), später Pflaume, Gegner
  systems/           Eingabe (Tastatur+Touch), Kamera, Effekte, Debug, Haptik, PWA, Querformat
  levels/            ASCII→Tiled-Konverter, Levels
  gfx/               Prozedurale Texturen (Pixel-Art als Strings, Tiles, Hintergrund)
  audio/             Chiptune-Synth (Etappe 7)
tests/run.mjs        Headless-Test Tastatur (Playwright)
tests/touch.mjs      Headless-Test Touch-Steuerung, Querformat, PWA
tools/make-icons.mjs PWA-Icons aus der Pip-Grafik erzeugen
```

Die Pixel-Art-Frames in `src/gfx/pipFrames.js` können später 1:1 durch ein echtes
Spritesheet (gleicher Texture-Key `pip`, gleiche Frame-Namen) ersetzt werden.
