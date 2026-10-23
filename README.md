# Lotti & Greta

Jump'n'Run fürs Smartphone im Querformat: ein **3D-Kurs-Plattformer** mit frei begehbarer Weltkarte
(Vorbild in der Anmutung: Super Mario 3D World), dazu das ursprüngliche Side-Scroller-Spiel als „Klassik“.
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

## Kurs-Modus (3D-Kurs-Plattformer) – Hauptspiel

Freie Bewegung in 3D, Kamera schräg von hinten oben mit Kameraschienen, lineare Hindernisparcours mit grünen
Sternen, Stempel und Zielmast – umgesetzt nach dem Level-Bauplan des Auftraggebers (Vorbild in der Anmutung:
Super Mario 3D World; alle Namen, Figuren und Titel eigen). Vertrag und Schnittstellen:
[`docs/KURS-ARCHITEKTUR.md`](docs/KURS-ARCHITEKTUR.md). Code unter `src/course/`.

**Start:** Ohne Parameter startet die frei begehbare **Kurs-Weltkarte** (Welt 1 „Grüne Blockinsel“): Zum
Eingang laufen und **A**/Leertaste/Enter (Touch: „Los!“-Knopf). Knopf „Klassik“ bzw. `?classic=1` öffnet das
bisherige Side-Scroller-Spiel. `?course=<id>` startet ein Level direkt, `?map=1` die Kurs-Karte.

**Welt 1** (24 Sterne; die Burg braucht 10):

| Id | Titel | Art |
| --- | --- | --- |
| 1-1 | Kraxelwiese | Wiesen-Parcours, führt den Krallen-Anzug ein |
| 1-2 | Laternengrotte | Höhle mit Laternen und Funkenblüte |
| 1-A | Hörnerkrach im Käfig | Arena gegen zwei Rammbock-Bullen (optional) |
| 1-3 | Kraxelei am Klötzchenberg | vertikaler Bergaufstieg, Riesenschnappblume |
| 1-Schatz | Pflaume und der Wolkenwürfel | Diorama: Pflaume als Schatzsucherin, springt nicht, 5 Sterne |
| 1-4 | Pflaumes Wildwasserfahrt | Fluss-Ritt auf Pflaume im Blatt-Floß |
| 1-5 | Kippfeld-Manege | Zirkus mit Kipp-Schaltfeldern |
| 1-Burg | Brummbärs Abendautobahn | Bosslevel gegen Baron Brummbär im roten Sportwagen |

Testlevel: `?course=0-0` (Übungsplatz), `0-1` (Gegnerpark), `0-2` (Bausteinpark).

**Welt 2 „Wüste mit Sandblöcken“** (eigene Insel, frei nach 1-Burg): Die Glasröhre hinter der Burg fährt übers Meer
zur Wüsteninsel, eine Glasröhre am Strand führt zurück; die geheime Welt-Warp-Röhre in 1-2 schaltet Welt 2 schon früher
frei. Auf der Insel: Schluchtweg (2-1), schwebende Sternenplattform (2-2, ab 15 Sternen), Höhle mit Lichtschein (2-3),
geheimnisvolles Haus (2-Haus, ab 20), Hügelwalze (2-4), Lava-Felsinsel mit drei Großrollpilzen (2-A), rosa Grasland
(2-5), Panzer-Depot von Baron Brummbär (2-Panzer, ab 30 – Sternbedarf zählt alle Sterne), Beerenhaus und
**Glückshaus** (Spielautomat: 10 Bitcoins Einsatz, drei Walzen, Gewinne Bitcoins, Leben oder ein Power-up). Die
zuletzt besuchte Welt wird gemerkt.

| Id | Titel | Art |
| --- | --- | --- |
| 2-1 | Rieselschlucht | Wüstenschlucht: Treibsand, Hackvögel, Goldröhre, Oase, Fliesenbrücken |
| 2-2 | Sternenklavier | Weltraum: Tastensteine, Antipp-Plattformen, Propellerplattformen, Münzmarder |
| 2-3 | Scherenschnittkeller | Schattentheater: Wege nur als Schatten, Topfpflanze, Krümel |
| 2-Haus | Villa Tick-Tack | Prüfungs-Haus: 5 Räume à 10 s, je ein Stern |
| 2-4 | Hügelmühle | Rollhügel, Lotti-/Greta-Schalter, Mühlenkeller mit Zahnrädern |
| 2-A | Glutsee-Rempelei | Arena: Großrollpilze in die Lava stoßen |
| 2-5 | Doppelgängersteig | Spiegelfrucht-Klone, Druckfelder für 2, Viererlift |
| 2-Panzer | Brummbärs Panzerparade | Fahrt über den Panzerzug, Kanonen-Helm, Boss Wirbelbrocken |

**Welt 3 „Schnee und Eis“** (frei nach 2-Panzer, Glasröhre am Ende der Wüsteninsel; Sternschranken 35/45/55):
Neu sind das **Gleitblatt** (Schweif-Hieb, Gleiten mit gehaltenem Sprung, Steinstatue mit Ducken + Aktion in der
Luft), Schlittschuhe, rutschiges Eis, rollende Schneebälle, Kettenzäune zum Klettern und Tauchen.

| Id | Titel | Art |
| --- | --- | --- |
| 3-1 | Flockenwiese | Schneefeld, Eisbahn, Schneebälle, Eisläufer mit Schlittschuh |
| 3-2 | Gitterbahn über den Wolken | Autoscroller an fahrenden Kettenzäunen |
| 3-3 | Die Mondscheinvilla | Spukhaus mit Licht-Helm, Drehraum und falschem Zielmast |
| 3-Kapitän | Krümel und der Röhrensee | Diorama mit Krümel: Glasröhren-Netz, Wasserschalter, 5 Sterne |
| 3-4 | Marzipangarten | kurzer Pastell-Garten (100 s) |
| 3-A | Krötenzauber im Roten Zwinger | Arena gegen drei Zauberkröten |
| 3-5 | Leuchtturmriff | Lagune mit Tauchgang, steigender Flut und Goldraum |
| 3-6 | Gipfelflitzer-Rennen | Bergrennen mit Boost-Pfeilen und Sprungfeldern |
| 3-B | Manege frei für den Schlangenkönig | Boss im Zirkuszelt, Seilbahn |
| 3-7 | Ahornklamm | Herbstwald mit Schalttafeln auf Schienen |
| 3-Zug | Volldampf durchs Schneetal | Zugfahrt als Autoscroller, Boss Schattenläuferin |

**Welt 4 „Canyon-Inselkette“** (frei nach 3-Zug; Sternschranken 60/70/80; die Welt-Warp-Röhre in 4-2 zeigt „Welt 5
kommt bald!“):

| Id | Titel | Art |
| --- | --- | --- |
| 4-1 | Kribbelkrabbel-Schlucht | Canyon: Ameisen tragen die Heldin an Wänden, Riesenameisen über Stacheln |
| 4-2 | Das Lila Nebelmoor | Giftsumpf mit Rankenschnappern, Sternring, Welt-Warp |
| 4-A | Glutbrocken-Gerangel | Arena: Lavabrocken in die Lava werfen |
| 4-3 | Neonsteg im Takt | Piep-Blöcke im Takt der Musik, Klone, Viererlift |
| 4-Haus | Haus Sausewind | Prüfungs-Haus: 10 Räume à 10 s |
| 4-4 | Trampolin-Alm | Bergwiese, Riesentrampolin-Fahrt, Flatterkäfer-Räder |
| 4-5 | Säulenstadt der Stachelwalzen | Ruinenstadt, Walzenwerfer, Stachelstangen, Räuberleiter |
| 4-B | Blaugitter-Bastion der Feuer-Werfer | Arena: drei Feuer-Werfer in 100 s |
| 4-Burg | Glutburg des Felsenkönigs | Lava-Burg, Boss Lavafelsen-König (nur geworfene Lavabrocken treffen) |

- **Tastatur:** Pfeile/WASD laufen (relativ zur Kamera), **Shift** rennen (Druck = Aktion, auch **X**:
  Feuerball, Krallenhieb, Aufheben/Werfen), **Leertaste** springen (Höhe nach Haltedauer), **Strg/C**
  ducken/rutschen (in der Luft: Stampfattacke), **Q/E** Kamera drehen, **Z** Zoom, **Tab** Figur (Karte),
  **M** Ton, **Esc/P** Pause, **F2** Debug-Anzeige.
- **Touch:** Stick links (ab ~85 % Auslenkung rennen), **A** springen, **B** ducken, **Y** Aktion/Rennen,
  ⟲ ⟳ ⊕ Kamera, Pause-Knopf oben rechts (`?touch=1` erzwingt die Knöpfe am PC).
- **Bewegungen:** Dreifachsprung, Rückwärtssalto (Ducken + Sprung im Stand), Seitwärtssalto (Umkehr + Sprung),
  Weitsprung (Rennen + Ducken + Sprung), Wandrutschen/Wandsprung, Stampfattacke, Rutschen, Klettern mit
  Krallen-Anzug, Bohnenranke, Schwimmen, Tragen/Werfen. Lotti springt höher, Greta weiter.
- **Power-ups:** Wachstumsbeere, Krallen-Anzug, Funkenblüte, Riesentrank, Funkelstern, 1-Up, Spiegelfrucht
  (Klone), Gleitblatt; Trage-Helme (Kanone, Propeller, Licht), Schlittschuh.
- **Tests:** `tests/course*.mjs` (deterministisch über `__course.step(n)`, Screenshots unter `tests/out/`),
  alle im `npm test`-Lauf.

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
