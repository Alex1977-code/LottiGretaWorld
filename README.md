# Lotti & Greta

Jump'n'Run fürs Smartphone im Querformat: klassische Side-Scroller-Spielweise, dargestellt in
echtem 3D im Stil moderner Spielzeug-Jump'n'Runs (Vorbild in der Anmutung: Super Mario 3D World).
Läuft im Browser, installierbar als PWA. Alle Grafiken und Sounds werden prozedural per Code erzeugt –
keine externen Assets.

Zwei spielbare Heldinnen: **Lotti** (dunkelblond, geflochtene Zöpfe, rote Schleife, blaues Kleid)
springt höher, **Greta** (hellblond, langes Haar mit Haarreif, grünes Kleid mit Schürze) springt
weiter (`HERO_VARIANTS` in `src/config.js`). Die Figur wird auf der Weltkarte über die Porträt-Knöpfe
gewählt (PC: Tab) und kann auch im Pause-Menü gewechselt werden.
**Pflaume**, ein schwarzes Schlappohr-Kaninchen mit weißer Brust, ist das Reittier; sein Halstuch nimmt
die Farbe der gefressenen Beere an und zeigt so die aktuelle Kraft. Beim Reiten hält die Heldin dem
Kaninchen eine Möhre an der Angel vor die Nase – deshalb rennt es schneller (`PFLAUME.rideSpeedMult`).
Die Sammelmünzen sind **Bitcoins**.

### Darstellung

- Die Spiellogik (Phaser 3, Arcade Physics) rechnet unverändert in 480x270 Weltpixeln mit 16-px-Tiles.
- Die 3D-Ansicht (Three.js, `src/three/`) zeichnet Welt, Figuren, Gegner, Objekte und Effekte auf einer
  eigenen WebGL-Leinwand unter der transparenten Phaser-Leinwand; HUD, Touch-Steuerung und Menüs bleiben
  in Phaser. Die Perspektivkamera folgt der Spielkamera und blickt leicht von oben (`src/render3d.js`).
- Jedes Phaser-Sprite bekommt über seinen Textur-Key einen **Avatar** (`src/three/avatars/`), der den
  Spielzustand liest und ein prozedural gebautes, prozedural animiertes 3D-Modell steuert. Die Welt
  entsteht aus der Logik-Tilemap (`src/three/world/`), die Weltkarte ist eine 3D-Insel (`src/three/map/`).
- Fällt die Bildrate, senkt die Ansicht stufenweise die Auflösung (`?adapt=0` schaltet das ab).
- `?r3d=0` schaltet auf die 2D-Vektorfassung zurück (Canvas-2D-Grafik in 2- bis 3-facher Auflösung,
  `src/gfx/`). Regeln: `docs/3D-STYLEGUIDE.md` (3D) und `docs/GRAFIK-STYLEGUIDE.md` (2D).

## Entwicklung

```bash
npm install
npm run dev        # Dev-Server (http://localhost:5173)
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal ansehen
npm test           # Headless-Tests (Chromium): Logik in 2D, 3D-Ansichten mit Screenshots → tests/out/
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

- **Weltkarte (3D-Insel):** Level-Podest antippen = hinlaufen (auch über mehrere Etappen), großer
  Knopf „Level starten“ unten rechts oder die Figur antippen = Level starten; Porträt-Knöpfe oben
  links wählen Lotti/Greta, daneben der Ton-Knopf.
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

- Pflaume (`F`), das Schlappohr-Kaninchen, wartet im Level; die Heldin springt drauf → Reiten (größere Hitbox, kein Blätterschirm).
- Beeren (`R` rot, `U` blau, `Y` gelb) frisst Pflaume beim Drüberreiten; die Kraft steht im HUD und färbt sein Halstuch:
  - **rot:** Aktion (X / Aktionsknopf) spuckt Feuerbälle, die über den Boden hüpfen und Gegner erledigen
  - **blau:** Sprungtaste in der Luft halten → 3 s Schweben (füllt sich am Boden wieder auf)
  - **gelb:** Aktion in der Luft → Stampfsprung: Erschütterung, Gegner im Umkreis, Steinblöcke darunter zerbrechen
- Ein Treffer beim Reiten kostet kein Herz: die Heldin wird abgeworfen, Pflaume flieht 3 s panisch in Gegenrichtung.
  Wer ihn in dieser Zeit berührt, sitzt wieder oben (Kraft bleibt) – sonst verschwindet er.

## Level 1 „Herbstwald“

`src/levels/level1.js` – ca. 2 Minuten, 300 Tiles breit. Fünf Bitcoins (`o`), Checkpoint in der
Mitte, Dornen (`^`), Pflaume mit allen drei Beeren. Normaler Ausgang: Zielfahne (`X`).
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

## Kurs-Modus (3D-Kurs-Plattformer, im Aufbau)

Der künftige Hauptmodus: freie Bewegung in 3D, Kamera schräg von hinten oben mit Kameraschienen, lineare
Hindernisparcours mit 3 grünen Sternen, Stempel und Zielmast. Vertrag und Schnittstellen:
[`docs/KURS-ARCHITEKTUR.md`](docs/KURS-ARCHITEKTUR.md) (inkl. „Präzisierung (Motor)“). Code unter
`src/course/` (Kollisionswelt, Spielfigur, Kamera, Bausteine, Entitäten, Level-Daten).

- Starten: `?course=0-0` (Übungsplatz mit allen Grund-Bausteinen und Bewegungen), `?course=0-2` (Bausteinpark:
  alle Sonder-Bausteine für Welt 1 – Glasröhre, Kipp-Schaltfelder, Laternen, Warp-Box, POW-Block, Wolkenkanone,
  Sternenring, Fang-Hase … je mit Schild). Ohne Parameter startet weiter die bisherige Weltkarte.
- Tastatur: Pfeile/WASD laufen (relativ zur Kamera), **Shift** rennen (Druck = Aktion, auch **X**),
  **Leertaste** springen (Höhe nach Haltedauer), **Strg/C** ducken/rutschen (in der Luft: Stampfattacke),
  **Q/E** Kamera ±30°, **Z** Zoom, **Esc/P** Pause, **F2** Debug-Anzeige.
- Touch: Stick links (ab ~85 % Auslenkung rennen), **A** springen, **B** ducken, **Y** Aktion/Rennen,
  ⟲ ⟳ ⊕ Kamera, Pause-Knopf oben rechts (`?touch=1` erzwingt die Knöpfe am PC).
- Bewegungen: Dreifachsprung (3 Sprünge kurz nach der Landung), Rückwärtssalto (Ducken + Sprung im Stand),
  Seitwärtssalto (Umkehr + Sprung), Weitsprung (Rennen + Ducken + Sprung), Wandrutschen/Wandsprung,
  Stampfattacke, Rutschen, Klettern mit Krallen-Anzug, Bohnenranke, Schwimmen.
- Tests: `node tests/course.mjs` (Bewegungsset deterministisch über `__course.step(n)`),
  `node tests/course_view.mjs` (Screenshots `tests/out/c_*.png`, Zeichenaufrufe/Dreiecke),
  `node tests/course_blocks.mjs` (Sonder-Bausteine im Bausteinpark, Screenshots `tests/out/cb_*.png`).

## Sound & Musik

Alles prozedural über die Web Audio API (`src/audio/`): `AudioEngine` (Kontext, Busse, Kompressor,
Synth-Stimmen: 909-Kick, Clap, Snare, Hats, Hoover-Lead, Stabs, Rave-Piano, Bass, Pad), `sfx.js`
(Effekt-Rezepte), `Music.js` (Step-Sequencer mit Lookahead, Akkord-Parser, Drum-Ebenen) und `themes.js`
(Pattern-Strings „Note:Dauer“ je Takt). Die Musik ist 90er-Eurodance als eigene Komposition: Level-Thema
mit 140 BPM in A-Moll (Beat, Oktav-Bass, Stabs, Hoover-Riff, Rave-Piano), ruhigere Karten-Variante,
kurze Rave-Fanfare am Levelende. Beim Reiten auf Pflaume kommt eine Energie-Ebene dazu (Lead-Doppelung,
Offbeat-Stabs). Audio wird bei der ersten Berührung/Taste freigeschaltet. Ton an/aus: Taste **M**,
Knopf auf der Weltkarte oder im Pause-Menü (wird gespeichert). `tests/audio.mjs` rendert die Themen
offline, prüft Pegel, Frequenzbänder und Beat und schreibt `tests/out/world1.wav` zum Anhören.

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
  gfx/               Prozedurale Vektor-Texturen: sprites/*.js (draw-Funktionen je Sheet), tiles.js
                     (Autotile-Boden), background.js (Parallax-Ebenen, Weltkarte); Styleguide in docs/
  render.js          Render-Skalierung (2–3x), Sprite-/Hitbox-Helfer, UI-Kamera
  ui.js              UI-Bausteine (Schrift, Panels, Pillen-Knöpfe)
  audio/             Web-Audio-Synth (Eurodance): Engine und Stimmen, Effekte, Sequencer, Themen
tests/run.mjs        Headless-Test Tastatur (Playwright)
tests/touch.mjs      Headless-Test Touch-Steuerung, Querformat, PWA
tests/enemies.mjs    Headless-Test Gegner, Schaden, Tod, Checkpoint
tests/pflaume.mjs    Headless-Test Reiten, Beeren-Kräfte, Flucht
tests/level1.mjs     Headless-Test Level 1 (Übersichtsbild, Münzen, Schlüssel/Tor, Fahne, Speicherstand)
tests/worldmap.mjs   Headless-Test Weltkarte (Freischaltung, Laufen, Geheimpfad, Pause, Zurücksetzen)
tools/make-icons.mjs PWA-Icons aus der Lotti-Grafik erzeugen
```

Die Vektor-Frames in `src/gfx/sprites/*.js` können später 1:1 durch echte Spritesheets
(gleicher Texture-Key, gleiche Frame-Namen) ersetzt werden. Frame-Verträge: `docs/GRAFIK-STYLEGUIDE.md`,
Prüfung: `node tools/check-frames.mjs`. Render-Skalierung erzwingen: `?scale=1|2|3`.
`tests/render.mjs` erzeugt Screenshots in voller Auflösung, `tests/sheets.mjs <keys>` exportiert Sheets.
