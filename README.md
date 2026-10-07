# Lotti & Greta

2D-Jump'n'Run im Geist klassischer 16-Bit-Plattformer, optimiert für Smartphones im
Querformat. Läuft im Browser, installierbar als PWA. Alle Grafiken und Sounds werden
prozedural per Code erzeugt – keine externen Assets.

Zwei spielbare Heldinnen mit gleichen Fähigkeiten: **Lotti** (dunkelblond, zwei Zöpfe) und
**Greta** (hellblond). Die Figur wird auf der Weltkarte gewählt (Tab oder Tippen auf die Figur).
**Pflaume**, der runde lila Käfer, ist das Reittier; seine Flecken nehmen die Farbe der gefressenen
Beere an und zeigen so die aktuelle Kraft.

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
| M              | Ton an/aus                                          |
| Esc / P        | Pause                                               |
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
- **Hüpfender Pilz** (`m`): wartet, duckt sich, springt Richtung Lotti.
- Draufspringen besiegt Gegner (Freeze-Frame 50 ms, Abprall – höher bei gehaltener Sprungtaste).
- Seitliche Berührung kostet ein Herz: Rückstoß, 1,5 s Unverwundbarkeit (Blinken).
- Drei Herzen; bei null (oder Sturz in die Tiefe) Respawn am letzten **Checkpoint** (`C`).

## Pflaume (Reittier)

- Pflaume (`F`) wartet im Level; die Heldin springt drauf → Reiten (größere Hitbox, kein Blätterschirm).
- Beeren (`R` rot, `U` blau, `Y` gelb) frisst Pflaume beim Drüberreiten; die Kraft steht im HUD und färbt seine Flecken:
  - **rot:** Aktion (X / Aktionsknopf) spuckt Feuerbälle, die über den Boden hüpfen und Gegner erledigen
  - **blau:** Sprungtaste in der Luft halten → 3 s Schweben (füllt sich am Boden wieder auf)
  - **gelb:** Aktion in der Luft → Stampfsprung: Erschütterung, Gegner im Umkreis, Steinblöcke darunter zerbrechen
- Ein Treffer beim Reiten kostet kein Herz: die Heldin wird abgeworfen, Pflaume flieht 3 s panisch in Gegenrichtung.
  Wer ihn in dieser Zeit berührt, sitzt wieder oben (Kraft bleibt) – sonst verschwindet er.

## Level 1 „Herbstwald“

`src/levels/level1.js` – ca. 2 Minuten, 300 Tiles breit. Fünf große Münzen (`o`), Checkpoint in der
Mitte, Dornen (`^`), Greta mit allen drei Beeren. Normaler Ausgang: Zielfahne (`X`).
Geheimer Ausgang: Schlüssel (`K`) in der Höhle unter dem Waldboden (Zugang per Stampfsprung durch die
Steindecke oder über die Treppe am Höhlenende), Tor (`G`) auf der Anhöhe vor dem Ziel.
Level per URL wählen: `?level=test` oder `?level=level1`.

Speicherstand (`localStorage`, `src/systems/SaveGame.js`): pro Level „geschafft“, „geheimer Ausgang“
und gesammelte Münzen. Bereits gespeicherte Münzen erscheinen halbtransparent.

## Weltkarte

`src/scenes/WorldMapScene.js` + `src/levels/worldmap.js`: vier Level-Punkte (Herbstwald, Pilzhain,
Wipfelpfad, Bachlauf), Lotti läuft auf Punktlinien zwischen ihnen. Ein Pfad wird frei, wenn das
Start-Level über den passenden Ausgang geschafft wurde; der geheime Ausgang von Level 1 öffnet den
goldenen Pfad direkt zu Level 3. Steuerung: Pfeile/Tippen in eine Richtung = laufen, Leertaste oder
Tippen auf Lotti/den Punkt = Level starten. „Spielstand löschen“ oben rechts (zweimal tippen).

Level 2–4 kommen vorerst aus einem seed-basierten Generator (`src/levels/generated.js`) und können
später durch handgebaute Levels ersetzt werden (gleicher Eintrag in `src/levels/index.js`).

Pause: Esc/P oder der Knopf oben in der Mitte → „Weiter“ / „Zur Weltkarte“.

## Sound & Musik

Alles prozedural über die Web Audio API (`src/audio/`): `AudioEngine` (Kontext, Busse, Ton/Rauschen),
`sfx.js` (Effekt-Rezepte), `Music.js` (Step-Sequencer mit Lookahead) und `themes.js` (Pattern-Strings
„Note:Dauer“ je Takt). Welt 1 hat ein Grundthema; beim Reiten auf Pflaume wird die Trommelspur
eingeblendet. Audio wird bei der ersten Berührung/Taste freigeschaltet. Ton an/aus: Taste **M**,
Knopf auf der Weltkarte oder im Pause-Menü (wird gespeichert).

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` baut bei jedem Push auf `master` und veröffentlicht `dist/`.
Einmalig im Repository aktivieren: **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
Danach ist das Spiel unter `https://<user>.github.io/<repo>/` erreichbar und als PWA installierbar
(Vite-Build mit relativem Base-Pfad, Service Worker mit Cache pro Build).

## PWA

`public/manifest.webmanifest` + `public/sw.js` (Service Worker, offline-fähig, Cache pro Build).
Icons liegen in `public/icons/` und werden mit `npm run icons` aus der Lotti-Grafik erzeugt.

## Struktur

```
src/
  main.js            Phaser-Konfiguration, Start
  config.js          Alle Physik-/Spielwerte zentral
  scenes/            Boot, WorldMap, Play, UI (Touch-Steuerung, HUD), LevelComplete, Pause
  entities/          Hero (Lotti/Greta), Pflaume, Fireball, Berry, Coin, Items (Key, Gate, Flag, Thorns), Gegner, Checkpoint
  systems/           Eingabe (Tastatur+Touch), Kamera, Effekte, Debug, Haptik, PWA, Querformat
  levels/            ASCII→Tiled-Konverter, Grid-Stempel, Testlevel, Level 1, Generator, Weltkarte, Register
  gfx/               Prozedurale Texturen: sprites/*.js (Pixel-Art als Strings, je Modul eigene Palette),
                     tiles.js (Autotile-Boden), background.js (Parallax-Ebenen); Styleguide in docs/
  audio/             Chiptune-Synth: Engine, Effekte, Sequencer, Themen
tests/run.mjs        Headless-Test Tastatur (Playwright)
tests/touch.mjs      Headless-Test Touch-Steuerung, Querformat, PWA
tests/enemies.mjs    Headless-Test Gegner, Schaden, Tod, Checkpoint
tests/pflaume.mjs    Headless-Test Reiten, Beeren-Kräfte, Flucht
tests/level1.mjs     Headless-Test Level 1 (Übersichtsbild, Münzen, Schlüssel/Tor, Fahne, Speicherstand)
tests/worldmap.mjs   Headless-Test Weltkarte (Freischaltung, Laufen, Geheimpfad, Pause, Zurücksetzen)
tools/make-icons.mjs PWA-Icons aus der Lotti-Grafik erzeugen
```

Die Pixel-Art-Frames in `src/gfx/sprites/*.js` können später 1:1 durch echte Spritesheets
(gleicher Texture-Key, gleiche Frame-Namen) ersetzt werden. Frame-Verträge: `docs/GRAFIK-STYLEGUIDE.md`,
Prüfung: `node tools/check-frames.mjs`.
