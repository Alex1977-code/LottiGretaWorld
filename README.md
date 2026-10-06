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

## Gegner, Schaden, Checkpoint

- **Laufkäfer** (`k` im ASCII-Level): läuft hin und her, dreht an Wänden und Kanten um.
- **Hüpfender Pilz** (`m`): wartet, duckt sich, springt Richtung Pip.
- Draufspringen besiegt Gegner (Freeze-Frame 50 ms, Abprall – höher bei gehaltener Sprungtaste).
- Seitliche Berührung kostet ein Herz: Rückstoß, 1,5 s Unverwundbarkeit (Blinken).
- Drei Herzen; bei null (oder Sturz in die Tiefe) Respawn am letzten **Checkpoint** (`C`).

## Pflaume (Reittier)

- Pflaume (`F`) wartet im Level; Pip springt drauf → Reiten (größere Hitbox, kein Blätterschirm).
- Beeren (`R` rot, `U` blau, `Y` gelb) frisst Pflaume beim Drüberreiten; die Kraft steht im HUD:
  - **rot:** Aktion (X / Aktionsknopf) spuckt Feuerbälle, die über den Boden hüpfen und Gegner erledigen
  - **blau:** Sprungtaste in der Luft halten → 3 s Schweben (füllt sich am Boden wieder auf)
  - **gelb:** Aktion in der Luft → Stampfsprung: Erschütterung, Gegner im Umkreis, Steinblöcke darunter zerbrechen
- Treffer beim Reiten kostet kein Herz: Pip wird abgeworfen, Pflaume flieht 3 s panisch in Gegenrichtung.
  Wer ihn in dieser Zeit berührt, sitzt wieder oben (Kraft bleibt) – sonst verschwindet er.

## Level 1 „Herbstwald“

`src/levels/level1.js` – ca. 2 Minuten, 300 Tiles breit. Fünf große Münzen (`o`), Checkpoint in der
Mitte, Dornen (`^`), Pflaume mit allen drei Beeren. Normaler Ausgang: Zielfahne (`X`).
Geheimer Ausgang: Schlüssel (`K`) in der Höhle unter dem Waldboden (Zugang per Stampfsprung durch die
Steindecke oder über die Treppe am Höhlenende), Tor (`G`) auf der Anhöhe vor dem Ziel.
Level per URL wählen: `?level=test` oder `?level=level1`.

Speicherstand (`localStorage`, `src/systems/SaveGame.js`): pro Level „geschafft“, „geheimer Ausgang“
und gesammelte Münzen. Bereits gespeicherte Münzen erscheinen halbtransparent.

## PWA

`public/manifest.webmanifest` + `public/sw.js` (Service Worker, offline-fähig, Cache pro Build).
Icons liegen in `public/icons/` und werden mit `npm run icons` aus der Pip-Grafik erzeugt.

## Struktur

```
src/
  main.js            Phaser-Konfiguration, Start
  config.js          Alle Physik-/Spielwerte zentral
  scenes/            Boot, Play, UI (Touch-Steuerung, HUD), LevelComplete
  entities/          Pip, Pflaume, Fireball, Berry, Coin, Items (Key, Gate, Flag, Thorns), Gegner, Checkpoint
  systems/           Eingabe (Tastatur+Touch), Kamera, Effekte, Debug, Haptik, PWA, Querformat
  levels/            ASCII→Tiled-Konverter, Grid-Stempel, Testlevel, Level 1, Level-Register
  gfx/               Prozedurale Texturen (Pixel-Art als Strings, Tiles, Hintergrund)
  audio/             Chiptune-Synth (Etappe 7)
tests/run.mjs        Headless-Test Tastatur (Playwright)
tests/touch.mjs      Headless-Test Touch-Steuerung, Querformat, PWA
tests/enemies.mjs    Headless-Test Gegner, Schaden, Tod, Checkpoint
tests/pflaume.mjs    Headless-Test Reiten, Beeren-Kräfte, Flucht
tests/level1.mjs     Headless-Test Level 1 (Übersichtsbild, Münzen, Schlüssel/Tor, Fahne, Speicherstand)
tools/make-icons.mjs PWA-Icons aus der Pip-Grafik erzeugen
```

Die Pixel-Art-Frames in `src/gfx/pipFrames.js` können später 1:1 durch ein echtes
Spritesheet (gleicher Texture-Key `pip`, gleiche Frame-Namen) ersetzt werden.
