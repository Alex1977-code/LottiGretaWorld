# Kurs-Modus – Architektur-Vertrag (3D-Kurs-Plattformer)

Grundlage: der Level-Bauplan des Auftraggebers (3D-Kurs-Plattformer nach Vorbild Super Mario 3D World,
12 Welten). Er liegt **nicht** im Repo, sondern als Datei beim Auftraggeber; Agenten bekommen den Pfad im
Auftrag. Dieses Dokument legt fest, wie der Bauplan in diesem Projekt umgesetzt wird. Alle Bau-Agenten
halten sich daran; Änderungen am Vertrag nur durch die Hauptsitzung.

## Ziel und Umfang

- Der **Kurs-Modus** wird das Hauptspiel: freie Bewegung in 3D (Stick = Richtung auf der Bodenebene),
  feste Schräg-von-hinten-oben-Kamera mit Kameraschienen, lineare Hindernisparcours (Start → Zielmast,
  2–5 min), je Level 3 versteckte Sterne + 1 Stempel.
- Reihenfolge laut Bauplan: Grundmechaniken → Level-Bausteine → Datenformat → **Welt 1 komplett**
  (inkl. Weltkarte und Freischaltung). Erst nach Abnahme durch den Auftraggeber weitere Welten.
- Das bisherige Side-Scroller-Spiel bleibt als **„Klassik“** erhalten (`?classic=1` und Knopf auf der
  Kurs-Weltkarte); sein Code wird nicht umgebaut.
- Übernommen aus dem bisherigen Spiel: Heldinnen **Lotti** (springt höher) und **Greta** (springt
  weiter, `HERO_VARIANTS`), Kaninchen **Pflaume** (Reittier im Fluss-Level, Hauptfigur der
  Schatzsucher-Dioramen statt „Kapitän“), **Bitcoins** als Münzen, Eurodance-Musik, Touch-Steuerung,
  PWA, Speichern im localStorage.

## Rechtliches (verbindlich)

Keine Nintendo-Namen, -Figuren, -Logos, -Musik oder -Leveltitel im Spiel. Gegner, Power-ups, Bosse
heißen wie in der Spalte „Arbeitsname“ des Bauplans (Pilzling, Krallen-Anzug, Funkenblüte …).
Leveltitel sind **eigene deutsche Titel**, keine Übersetzungen der Originaltitel. Aussehen aller Figuren
eigenständig (eigene Formen, Farben, Proportionen). Übernommen werden nur Spielideen, Aufbau, Rhythmus.
Der Endgegner heißt **Baron Brummbär** (grimmiger Bär im roten Sportwagen, Zylinder, Monokel).

## Koordinaten und Maßstab

- **1 Einheit = 1 Meter.** Figur „groß“ 1,0 m hoch, „klein“ 0,7 m; ein Block = 1 m.
- Three.js-Weltkoordinaten **direkt**, auch im Level-Datenformat: **Y oben, Levels verlaufen nach −Z**
  (Start bei z ≈ 0, Ziel z.B. bei z = −220), **+X = rechts im Bild**. Die Standardkamera steht hinter
  der Figur (größeres z) und darüber und blickt nach −Z schräg nach unten.
- Blickrichtung/Gier einer Figur: `yaw` in Radiant um +Y; Modelle blicken bei `yaw = 0` nach **+X**
  (wie die vorhandenen Avatare). Laufrichtung (dx, dz) → `yaw = Math.atan2(-dz, dx)`.

## Ordner

```
src/course/
  CourseScene.js        Phaser-Szene 'Course': Simulation (fester Zeitschritt), 3D-Ansicht, Ablauf
  CourseUIScene.js      Phaser-Szene 'CourseUI': HUD, Touch-Steuerung (über der 3D-Leinwand)
  view/                 3D-Ansicht: Szene, Kamera(schienen), Licht, Himmel, Schatten-Blob, Effekte
  physics/              Kollisionswelt (Quader, Rampen, Zylinder), Bewegung mit Kollision, Raycasts
  player/               Spielfigur-Controller (Bewegungsset), Power-ups, HeroRig (Avatar-Anbindung)
  input/                Kurs-Eingabe (Tastatur + Touch-Zustand)
  level/                Level-Loader, Level-Laufzeit (Timer, Checkpoint, Sterne, Ziel), Speicherstand
  blocks/index.js       Registry der Bausteine   (sammelt blocks/types/*.js per import.meta.glob)
  entities/index.js     Registry der Entitäten   (sammelt entities/kinds/*.js)
  models/index.js       Registry der 3D-Modelle  (sammelt models/kinds/*.js)
  levels/index.js       Registry der Level-Daten (sammelt levels/**/*.js)
```

Die vier Registries sammeln ihre Module **automatisch** (`import.meta.glob(..., { eager: true })`) –
neue Bausteine, Gegner, Modelle, Level sind neue Dateien, kein Eintrag in einer gemeinsamen Liste.
So können Agenten parallel arbeiten, ohne dieselbe Datei zu bearbeiten.

## Szenenfluss

- `?course=<id>` startet ein Kurs-Level direkt (z. B. `?course=0-0`, `?course=1-1`).
- Später (Phase 2): `CourseMap` (frei begehbare 3D-Insel je Welt, Level-Eingänge) wird Startszene;
  bis dahin bleibt die bisherige Weltkarte Standard.
- Level-Ende → Ergebnis (Zielmast-Höhe, Münzen, Sterne, Zeit) → Weltkarte. Pause: Weiter, Neustart,
  Zur Weltkarte, Ton, Figur. Tod → Neustart am Checkpoint (Leben −1); Leben 0 → Weltkarte, Leben auf 5.

## Simulation

- Fester Zeitschritt 1/120 s (max. 8 Schritte je Bild), Darstellung je Bild interpoliert oder direkt.
- Kollisionswelt: statische und bewegte Formen
  - `box` (AABB: min/max), `ramp` (Quader mit schräger Oberseite, Achse x|z, Richtung ±1),
    `cyl` (senkrechter Zylinder: x, z, r, y0, y1).
  - Flags je Form: `solid` (Standard), `oneWay` (nur von oben), `climbable` (Krallen-Kletterwand),
    `kill` (Lava/Abgrund-Ebene), `water`, `bounce: Stärke`, `conveyor: {x,z}`, `ice`, `hit` (Callback
    bei Stoß von unten), `breakable` (Stampfen/Riesentrank), `mover` (Referenz auf bewegte Plattform,
    Figur wird mitgenommen), `owner` (Entität oder Baustein, für Callbacks).
- Pflicht-API der Kollisionswelt (andere Agenten nutzen sie):
  `add(shape) → id`, `remove(id)`, `update(id, shape)`,
  `moveAABB(center: Vector3, half: Vector3, delta: Vector3, opts) → { grounded, ceiling, hitWall,
  wallNormal, ground: shape|null, ceilingShape, hits: shape[] }`,
  `raycastDown(x, y, z, maxDist) → { y, shape } | null`, `overlapAABB(center, half) → shape[]`.
- Figur-Hitbox: AABB 0,6 × Höhe × 0,6 (groß 0,95, klein 0,65).

## Bewegungsset (Richtwerte aus dem Bauplan, Feinschliff erlaubt)

| Aktion | Tastatur | Touch | Wert |
| --- | --- | --- | --- |
| Gehen / Rennen | Pfeile/WASD, Rennen mit Shift (gehalten) | Stick; ab ~85 % Auslenkung Rennen | 6 / 10 m/s |
| Sprung (Höhe nach Haltedauer) | Leertaste | A-Knopf | 2,5–4 m |
| Dreifachsprung | 3 Sprünge kurz nach Landung bei Tempo | | 3 / 4 / 5,5 m |
| Rückwärtssalto | Ducken + Sprung im Stand | B halten + A | 5 m hoch |
| Seitwärtssalto | Richtungswechsel + Sprung | | 4,5 m |
| Weitsprung | Rennen + Ducken + Sprung | | 7 m weit, flach |
| Wandsprung | Sprung an Wand (im Wandrutschen) | | 3 m |
| Stampfattacke | Ducken in der Luft | B in der Luft | zerstört Ziegel, drückt Schalter |
| Ducken / Rutschen | Strg oder C | B-Knopf | hangabwärts schneller |
| Aktion | Shift-Druck (= Rennen-Taste) bzw. X | Y-Knopf | Feuerball, Krallenhieb, Werfen |
| Kamera ±30° / Zoom | Q / E, Z | Kamera-Knöpfe | 2 Zoomstufen |
| Pause / Debug | Esc/P, F2 | Pause-Knopf | |

- Lotti: Sprunghöhe ×1,08. Greta: Lauftempo ×1,12, Luftsteuerung ×1,4, Fallen ×0,75 (`HERO_VARIANTS`).
- Klein/Groß (Wachstumsbeere), Treffer: groß → klein, klein → Tod; danach 1,5 s unverwundbar (Blinken).
- **Kamera:** Schräg von hinten oben, Neigung 45–55°, Abstand 12–16 m; Kameraschienen je Abschnitt
  (`camera`-Liste im Level, nach z-Fortschritt), weich überblendet; Spieler kann ±30° drehen und
  zwischen 2 Zoomstufen wechseln. **Schatten-Blob** unter der Figur (Pflicht), auch unter Gegnern.

## Level-Datenformat

Level sind **JS-Module mit reinen Daten** (Hilfsfunktionen für Wiederholungen erlaubt) unter
`src/course/levels/w<Welt>/<id>.js`, Export `export const LEVEL = { ... }`:

```js
export const LEVEL = {
  id: '1-1', world: 1, title: 'Eigener Titel', archetype: 'parcours', // parcours|autoscroller|arena|boss|diorama|house
  theme: 'grass',            // grass|cave|circus|river|highway|diorama|test …
  music: 'course_grass',     // Thema aus src/audio/themes.js
  timeLimit: 500,
  start: { pos: [0, 1, 0], yaw: Math.PI / 2 },         // yaw = Blick nach −Z
  camera: [{ from: 0, to: -60, pitch: 50, dist: 14, yaw: 0 }],  // from/to = z-Bereich
  segments: [                 // Bausteine (Typ → blocks/types/*.js)
    { type: 'island', pos: [0, 0, -8], size: [12, 1, 16] },
    { type: 'bridge', from: [0, 0, -16], to: [0, 0, -28], width: 2 },
    { type: 'wall', pos: [0, 1, -36], size: [8, 6, 1], climbable: true },
  ],
  blocks: [{ kind: 'question', pos: [0, 3, -6], content: 'krallenAnzug' }],
  enemies: [{ kind: 'pilzling', pos: [-3, 1, -24], path: [[-4, 1, -24], [4, 1, -24]] }],
  items: [{ kind: 'coin', pos: [0, 2, -12] }],
  checkpoint: [0, 1, -30],
  stars: [[6, 2, -14], [0, 8, -36], [-5, 1, -52]],
  stamp: [3, 4, -46],
  goal: [0, 1, -60],
};
```

`pos` ist bei Volumen der **Mittelpunkt der Unterseite** (x, y-unten, z) und `size` = [Breite x, Höhe y,
Tiefe z], sofern ein Baustein nichts anderes dokumentiert. Jeder Baustein dokumentiert seine Parameter im
Kopfkommentar seiner Datei.

## Schnittstellen der Registries

- **Bausteine** (`blocks/types/*.js`): `export const TYPES = { name: build }` mit
  `build(level, spec)` – fügt Kollisionsformen (`level.world.add`), Darstellung (`level.view.addStatic`
  für zu verschmelzende statische Geometrie bzw. `level.view.add` für Objekte) und ggf. Entitäten
  (`level.spawn(kind, spec)`) hinzu.
- **Entitäten** (`entities/kinds/*.js`): `export const KINDS = { name: (level, spec) => entity }`.
  Entität erweitert `CourseEntity` (Basisklasse in `entities/CourseEntity.js`):
  Felder `pos`, `vel`, `half` (AABB-Halbmaße), `yaw`, `alive`, `model` ({ root, update, dispose });
  Methoden `update(dt)`, `onPlayer(player, contact) → 'stomp' | 'hurt' | 'collect' | 'none'`,
  `onStomp(player)`, `onHit(kind)` ('fire' | 'claw' | 'shell' | 'pound' | 'mega' | 'star'),
  `dispose()`. Gegner sind Zustandsautomaten (Patrouille, Verfolgen, Angriff, Betäubt), je Typ eine Datei.
- **Modelle** (`models/kinds/*.js`): `export const MODELS = { name: (opts) => model }` mit
  `model = { root: THREE.Object3D, update(dt, state), dispose() }`. Maßstab Meter, Ursprung = Fußpunkt,
  Blick nach +X. `state` je Modell im Kopfkommentar dokumentiert (z.B. Pilzling `{ anim: 'walk'|'idle'|
  'squashed'|'stunned'|'alert', speed }`). `getModel(name, opts)` liefert ein Platzhalter-Modell, wenn
  der Name fehlt.
- **Level** (`levels/w*/*.js`): `export const LEVEL`. `getLevel(id)`, `listLevels(world)`.

## Spielfigur-Darstellung (HeroRig)

Die Heldin nutzt den vorhandenen `HeroAvatar` (`src/three/avatars/hero.js`), Pflaume den
`PflaumeAvatar`. Kurs-Anbindung über einen Stellvertreter (`proxy`) statt Phaser-Sprite:

- `avatar.setCourseMode(true)` schaltet den Kurs-Modus ein: der Avatar setzt dann **keine** eigene
  Blickrichtung/Kameraneigung (Modell blickt nach +X), Position/Gier setzt der Kurs-Code an
  `avatar.root`; Größe: Kurs-Code skaliert eine Hülle (1,5 Avatar-Einheiten → 1,0 m bzw. 0,7 m).
- Der Kurs-Code ruft je Bild `avatar.animate(dt, t)` und befüllt vorher `proxy.course`:
  `{ state, speed, vy, grounded, phase, power, big, holding, climbing }` mit
  `state ∈ idle | walk | run | skid | jump | jump2 | jump3 | backflip | sideflip | longjump | fall |
  land | crouch | slide | groundpound | wallslide | walljump | climb | beanstalk | swim | ride | pipe |
  hurt | dead | victory | throw | claw`; `speed` m/s horizontal, `vy` m/s, `phase` 0..1 (Saltos, Stampfen).
- Pflaume (`PflaumeAvatar`) im Kurs-Modus: `proxy.course.state ∈ idle | walk | run | jump | ride |
  paddle | dig | victory`, `power`-Farbe wie bisher; Zubehör `proxy.course.gear = 'lamp'` (Schatzsucherin
  mit Stirnlampe und Rucksack in den Dioramen).
- Solange `setCourseMode` fehlt (ältere Avatare), füllt der Kurs-Code die alten Sprite-Felder
  (`body.velocity` in px/s, `moveState`, `onGround`) als Rückfall.

## Darstellung

- Gemeinsamer Renderer `src/three/renderer.js` (`getRenderer`, `mountCanvas`, `layoutCanvas`,
  `hideCanvas`, `adaptQuality`). Phaser-Leinwand transparent darüber (HUD, Touch, Menüs).
- Look: Super-Mario-3D-World-Anmutung – kräftige Grundfarben, runde Blockkanten, Grasdecken, weiße
  Holzbrücken, Glasröhren, weiche Schatten, Himmel mit Wolken; vorhandene Bausteine wiederverwenden
  (`src/three/world/geometry.js`: `roundedBox`, `colorize`, `merge`; `src/three/lib/figures.js`).
- Statische Level-Geometrie je Abschnitt (z.B. 32 m) zu wenigen Meshes verschmelzen (Vertexfarben),
  Frustum-Culling je Abschnitt. Budget: < 120 Zeichenaufrufe inkl. Schattenpass, < 300 k Dreiecke,
  Ziel 60 fps auf Mittelklasse-Handy.

## Audio

Themen in `src/audio/themes.js` (Eurodance, eigene Kompositionen): `course_grass`, `course_cave`,
`course_circus`, `course_river`, `course_boss`, `course_arena`, `course_diorama`, `course_map`.
Effekte (`sfx(name)`): `jump`, `jump2`, `jump3`, `backflip`, `longjump`, `walljump`, `groundpound`,
`slide`, `land`, `coin`, `star`, `stamp`, `powerup`, `powerdown`, `oneup`, `blockhit`, `brickbreak`,
`pipe`, `checkpoint`, `goalpole`, `timewarn`, `claw`, `fireball`, `stomp`, `hurt`, `die`, `switch`,
`bounce`. Fehlende Namen sind stumm (kein Fehler).

## Speicherstand

`lotti-greta-course-v1` im localStorage: `{ hero, lives, coins, world, mapPos, levels: { '1-1':
{ done, stars: [b,b,b], stamp, bestTime, bestPole } } }`; Freischaltung: Level-Kette je Welt,
Burg/Boss braucht Mindest-Sternzahl (Welt 1: 10).

## Tests

- Kurs-Tests heißen `tests/course*.mjs`; Laden mit `?course=<id>&scale=2&adapt=0`.
- `window.__course` = laufende `CourseScene` mit `player`, `level`, `world`, `entities`,
  `teleport(x, y, z)`, `state()` (Kurzinfo für Tests).
- Headless-Chromium rendert per Software (2–5 Bilder/s): Physik und Zeitabläufe **deterministisch**
  prüfen (Simulation direkt schrittweise über `__course.step(n)` vorantreiben), Bilder nur zur
  Sichtprüfung. `step(n)` muss es geben.
