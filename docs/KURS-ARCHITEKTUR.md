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
`course_circus`, `course_river`, `course_boss`, `course_arena`, `course_diorama`, `course_map`. Die Themen der
Welten 2–8 und der Halloween-Welt (bis zu Finale und Abspann) stehen in „Präzisierung (Audio Welten 2–4, Taktuhr)“, dort
auch die Bonuswelt-Themen und die Klang-Varianten der Remix-Level (`music.play(thema, { variant })`).
Effekte (`sfx(name)`): `jump`, `jump2`, `jump3`, `backflip`, `longjump`, `walljump`, `groundpound`,
`slide`, `land`, `coin`, `star`, `stamp`, `powerup`, `powerdown`, `oneup`, `blockhit`, `brickbreak`,
`pipe`, `checkpoint`, `goalpole`, `timewarn`, `claw`, `fireball`, `stomp`, `hurt`, `die`, `switch`,
`bounce`. Fehlende Namen sind stumm (kein Fehler).

Vertragsnotiz (ergänzte Effekte, `MORE_SFX` = `engine.effects.more`): die bisher stumm aufgerufenen Namen sind eigene
Effekte – Figur `skid`, `glide`, `wallslide`, `swim`, `fence` (Zaun/Deckengitter), `grab`/`swing` (Trapez), `victory`
(Siegespose, kleine Fanfare ≈ 0,9 s über der Level-Musik; läuft schon die Musik-Fanfare `course_clear`, z. B. in der
Arena, spielt `sfx()` nur Jubel-Glitzer – Rezepte bekommen dann `{ overFanfare: true }`); Fahrt/Bausteine `fall`, `boost`,
`chain`, `alarm`, `flip`, `donut`, `pfiff`, `note0`–`note7` (Tastenstein, C-Dur-Pentatonik); Gegner `hop`, `dash`, `kick`,
`dizzy`, `boomerang`, `dig`, `throw`, `fuse`, `burn`. Lautheit wie die übrigen Effekte (Median −23 LUFS, Wiederholklänge
−25), höchstens 26 Knoten. **Drosselung:** derselbe Name klingt erst nach einem Mindestabstand wieder (`SFX_GAP` in
`src/audio/sfx.js`, z. B. `swim` 0,2 s, `wallslide` 0,35 s, `hop` 0,15 s, `chain` 0,5 s; alle übrigen 0,03 s – gleichzeitige
Auslösungen im selben Bild klingen einmal). **Neue Namen** zuerst als Effekt anlegen: `node tests/sfx_namen.mjs` (auch in
`tests/audio.mjs`, Teil `sfx`) sammelt alle Aufrufnamen in `src/**` (`sfx`/`level.sfx`/`w6Sfx`/`hwSfx`, `{ sfx: … }`,
Ersatz-Tabelle `SFX6`) und meldet jeden ohne Effekt; dynamische Namen (Variablen, Template-Strings) dort in `DYNAMIC` mit
den möglichen Namen eintragen. Hörprobe `tests/out/sfx_demo_fehlende.wav`.

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

---

## Präzisierung (Motor)

Ergänzungen des Motor-Agenten (Stand: Übungslevel 0-0). Nichts oben Festgelegtes wird geändert; hier steht,
wie der Motor die Schnittstellen konkret umsetzt und was Folge-Agenten (Gegner-KI, Power-ups, Bausteine,
Weltkarte, Level-Bau) nutzen können.

### Präzisierung (Motor): Dateien

```
src/course/
  CourseScene.js  CourseUIScene.js  CoursePauseScene.js ('CoursePause')  CourseResultScene.js ('CourseResult')
  CourseBoot.js           Boot für ?course=<id> (erweitert die Klassik-BootScene, ohne sie zu ändern)
  physics/  CollisionWorld.js (Gitter 4 m, moveAABB, Raycasts)   shapes.js (Normalisierung, Höhen, Überlappung)
  player/   Player.js (Bewegungsset)  moveset.js (alle Werte)  HeroRig.js  powers.js (Registry) + powers/*.js
  input/    CourseInput.js (Tastatur/Touch/Test)  CourseTouch.js (Stick + A/B/Y + Kamera-Knöpfe)
  view/     CourseView.js  CameraRig.js  Sky.js  themes.js  StaticBatcher.js  InstancePool.js  BlobShadows.js  Effects.js
  level/    Level.js (Simulationsschritt, spawn …)  LevelLoader.js  LevelRuntime.js  CourseSave.js  PathMover.js
  blocks/   kit.js (Geometrie-Baukasten, liegt außerhalb von types/)  types/*.js (je Baustein eine Datei)
  entities/ CourseEntity.js  visuals.js (Rückfall-Optik Items/Blöcke)  kinds/{items,blocks,checkpoint,goal,pilzling}.js
  levels/w0/0-0.js        Übungsplatz
```

### Präzisierung (Motor): Kollisionswelt

- Formen: `ramp` hat zusätzlich `low` (absolute Höhe der Oberseite am unteren Ende, Standard `min.y`); die Oberseite
  steigt entlang `axis` in Richtung `dir`. Steiler als ~50° (`slope > 1,2`) ist bergauf eine Wand; ab ~37° rutscht
  die Figur ab. `cyl` mit `x, z, r, y0, y1`. `min/max` dürfen Arrays oder `{x,y,z}` sein.
- Weitere Flags: `fromBelowOnly` (versteckter Block: nur Kopfstöße von unten), `trigger` (nicht fest, nur
  `overlapAABB`), `boost: {x, z, speed}`, `beanstalk`, `pipe: {x, z, top, enterRadius, enter(player)}`,
  `camIgnore` (Kamerastrahl geht hindurch), `noWallSlide`, `noStep`, `tag` (Name zur Fehlersuche).
  `solid` ist Standard `true` außer bei `water`, `kill`, `trigger`, `beanstalk`. `kill` = `'lava'` | `'fall'` | `true`.
  Bewegte Formen: `mover = { dx, dy, dz, vx, vy, vz, dyaw, cx, cz }` (Verschiebung/Drehung **dieses Schritts**,
  Drehpunkt cx/cz); nach dem Ändern `world.update(id)` aufrufen.
- `moveAABB(center, half, delta, opts)`: Teilschritte ≤ 0,2 m, je Teilschritt X → Z → Y. `opts.step` (0,3 m Stufen/
  Kantenhilfe), `opts.snap` (Bodenhaftung nach unten, nur bei dy ≤ 0), `opts.foot` (halbe Breite des Fuß-Quadrats,
  Standard halbe Breite/2 – nur damit steht man; ragt nur der Rand über, rutscht man ab), `opts.nudge` (Ecken-Korrektur
  am Kopf), `opts.ignore(shape)`. Ergebnis zusätzlich `wallShape`, `stepped`; `wallNormal` ist ein `{x,y,z}`-Objekt.
- `raycastDown(x, y, z, maxDist, opts)`: `opts.water` schließt Wasseroberflächen ein, `opts.all` alles.
  `overlapAABB(center, half, { filter })`. `raycast(a, b, filter?) → { t, shape }` (Kamera).
- 3000 Formen: 1200 Bewegungen ≈ 25 ms (Node), also weit unter 1 ms je Schritt.

### Präzisierung (Motor): Simulationsschritt und Level-Objekt

`level` (an Bausteine/Entitäten übergeben): `data, id, world, view, runtime, player, entities, time, killY, bounds,
rnd, named` · `spawn(kind, spec)`, `hasKind(kind)`, `onStep(fn(dt, t)) → abmelden`, `sfx(name)`, `effects`,
`shake(a)`, `addCoins(n)`, `addLife(n)`, `attackArea(pos, radius, kind, source)`.
Reihenfolge je Schritt (1/120 s): `onStep`-Funktionen (bewegte Plattformen) → Figur → `entity.update(dt)` →
Berührungen (`onPlayer`) → Angriffe der Figur (`onHit`) → Laufzeit (Timer, Absturz unter `killY`) → Entfernen
(`entity.removed` → `dispose()`). Darstellung je Bild: `entity.render(dt, t)` (Standard: Modell an pos/yaw +
`model.update(dt, entity.modelState())`).

### Präzisierung (Motor): Entitäten (Muster `entities/kinds/pilzling.js`)

- `CourseEntity`: zusätzlich `level, spec, kind, enemy` (Gegner → Funkelstern/Riesentrank besiegen ihn),
  `touch` (false = keine Berührungsprüfung), `shadow` (Blob-Radius), `grounded, ground, removed` und Hilfen
  `setModel(model)`, `syncModel()`, `modelState()`, `addShape(shape)` (owner = Entität, wird beim Entfernen gelöscht),
  `moveWithGravity(dt, opts)` (Schwerkraft 40 m/s², Plattformen/Förderbänder nehmen mit), `groundAhead(dx, dz)`
  (Kantenerkennung), `kill()`.
- `onPlayer(player, contact)`, `contact = { fromAbove, pound, dive, star, dx, dz, speed }`. Rückgabe `'stomp'` →
  Figur prallt ab (9,5 m/s, mit gehaltener Taste 13), `'hurt'` → `player.hurt(entity)`, `'collect'`/`'none'` → nichts.
- `onHit(kind, source)` mit `kind ∈ fire | claw | shell | pound | mega | star | bump` (`bump` = Block darunter
  wurde gestoßen). Blöcke haben zusätzlich `onBump(player)` (Kopfstoß) und `onPound(player)` (von oben gestampft).
- Gegner-Modelle über `getModel(name)`; Pilzling-Zustand `{ anim: walk|idle|squashed|stunned, speed }`.

### Präzisierung (Motor): Spielfigur und Power-ups

- `player`: `pos` (Fußpunkt), `vel`, `yaw`, `half`, `mode ∈ ground|air|wall|stalk|swim|script`, `state` (Liste im
  Vertrag, zusätzlich intern `dive` = Krallen-Sturzflug), `phase`, `big`, `power`, `powerTime`, `hero`,
  `invuln`, `dead`, `deathCause`. Methoden: `hurt(source)`, `collectPowerup(name)`, `setPower(name)`,
  `bounceOff(input)`, `attack(kind, reach, duration)`, `enterPipe(pipe)`, `grabPole(goal)`, `die(cause)`,
  `setHero(key)`, `facingVec()`, `center()`, `info()`.
- Power-ups: Registry `player/powers.js` sammelt `player/powers/*.js` (`export const POWERS = { name: def }`).
  `def`: `label, icon, big, duration, invulnerable, canClimb, scale, onGain, onLose, update(player, dt, input),
  onAction(player, input)` (Y/X/Shift), `onAirCrouch(player, input)` (statt Stampfattacke, z. B. Sturzflug),
  `onTouchEntity(player, entity, contact)`. Vorhanden: `krallen` (Klettern ~2 s, Sturzflug, einfacher Tatzenhieb),
  Gerüst `funken` (wirft Entität `fireball`, sobald es sie gibt), `riese` (10 s, ×2,4, unverwundbar, zerbricht/besiegt),
  `stern` (10 s unverwundbar). Namen aus Level-Daten werden vereinheitlicht (`krallenAnzug` → `krallen`,
  `funkenbluete` → `funken`, `riesentrank` → `riese`, `funkelstern` → `stern`, `1up` → `oneup`).
- Treffer: Power-up → keines (bleibt groß), groß → klein, klein → Tod; danach 1,5 s unverwundbar. Levelstart und
  Neustart: groß ohne Power-up.

### Präzisierung (Motor): Bewegungswerte (`player/moveset.js`, abgestimmt und per Test gemessen)

| Aktion | Wert im Motor (Lotti ×1,08 Höhe; Greta ×1,12 Tempo, ×1,4 Luftsteuerung, ×0,75 Fallschwerkraft) |
| --- | --- |
| Gehen / Rennen | 6 / 10 m/s, Anlauf 34 m/s² (bis Gehtempo), 13 m/s² (bis Renntempo), Bremsen 42 m/s² |
| Schleudern | Umkehr > 125° ab 5 m/s, Bremsen 46 m/s² |
| Schwerkraft | Steigen 27 (Taste gehalten) / 38 (losgelassen), Fallen 50 m/s², Scheitel ×0,6, max. 24 m/s |
| Sprung | Stand 3,5 m (+0,05 m je m/s Anlauf, Rennen ≈ 4 m); kurz getippt ≈ 2,5 m |
| Dreifachsprung | 3,5–4 / 4,5 / 5,6 m, Fenster 0,22 s nach der Landung, ab 3,5 m/s |
| Rückwärtssalto | 5 m, 2,6 m/s nach hinten · Seitwärtssalto 4,6 m · Weitsprung ≥ 12 m/s, 8,6 m/s hoch, g = 30 → ≈ 7 m |
| Wand | Rutschen max. 3,4 m/s, Wandsprung 3,2 m hoch + 7,5 m/s weg, 0,22 s ohne Luftsteuerung |
| Krallen | Klettern 4,6 m/s für 2 s, Sturzflug 11 m/s vor / 10 m/s ab |
| Stampfen | 0,22 s Drehung, 26 m/s Sturz, 0,22 s Landestarre |
| Coyote / Puffer | 0,1 s / 0,13 s |
| Schwimmen | 4,5 m/s, Auftrieb 10 m/s², Schwimmzug 5,5 m/s, Aussprung 10,5 m/s |

Gemessen (tests/course.mjs, Lotti): Sprung 2,75 / 3,87 m, Greta 3,59 m; Renn-Sprungweite Lotti ≈ 10,6 m,
Greta ≈ 12,2 m; Dreifachsprung ≈ 4,2 / 5,0 / 6,2 m; Rückwärtssalto 5,5 m; Seitwärtssalto 5,1 m; Weitsprung 7,0 m
bei 1,3 m Höhe.

### Präzisierung (Motor): HeroRig

- Hülle `hull` (Position, Gier, Maßstab 1/1,5 bzw. 0,7/1,5, × `def.scale`), darin `flip` (Drehpunkt Körpermitte),
  darin `avatar.root`. `proxy.course` wird je Bild gefüllt; `state` `dive` wird als `longjump` gemeldet.
- Rückfall ohne `setCourseMode`: `body.velocity.x = Tempo·16` (im Stand 0), `body.velocity.y = −vy·16`,
  `moveState` `ground|air` (Schwimmen `glide`), `onGround`, `flipX = false`; Saltos/Stampfdrehung/Sturzflug-Lage
  dreht HeroRig an `flip`, und die 3/4-Facing-Drehung des Avatars wird an `avatar.root` ausgeglichen. Mit
  `setCourseMode(true)` erwartet HeroRig, dass der Avatar Saltos selbst über `phase` animiert.

### Präzisierung (Motor): Kamera

Schienen-Einträge (`LEVEL.camera`): `from, to, pitch (50), dist (14), yaw (0; positiv = Kamera nach +X), fov (38),
x (Blickziel seitlich fixieren) + xLock (0..1), height (1,0 m über Fuß), lead (Vorausschau-Faktor), ahead (2 m
Blickziel vor der Figur), area: [xMin, xMax]` (Abschnitt gilt nur in diesem X-Bereich – Bonusräume abseits).
Überblendung über 8 m. Steuerung relativ zur Kamera; die Steuerungs-Gier kommt unverzögert aus Schiene + Spieler-
drehung (deterministisch). Senkrecht verankert an der letzten Standhöhe. Kollision: Strahl vom Kopf der Figur zur
Kamera, bei Verdeckung rückt die Kamera näher (min. 3 m). Q/E bzw. ⟲ ⟳ drehen in 15°-Schritten bis ±30°, Z bzw.
⊕ wechselt Zoom (100 % / 74 %).

### Präzisierung (Motor): Darstellung

`view.addStatic(geometry, { material: 'world'|'stone'|'glow', castShadow, receiveShadow })` (Weltkoordinaten,
Vertexfarben, wird je 32 m z-Abschnitt verschmolzen), `view.add(obj, update?)`, `view.onFrame(fn)`,
`view.pool(name, makeTemplate, opts)` (Instanzen, z. B. Münzen und Blöcke – Modelle aus `getModel` werden
automatisch instanziert), `view.shadows.add({ pos, radius, alive, visible })`, `view.effects.dust|ring|sparks|
debris|splash|coinPop`, `view.addLantern(x, y, z)` (Thema `cave`), `view.theme` (Farben, `themes.js`).
Themen: `grass`, `test` (Schachbrett-Raster 1 m), `cave` (dunkel, Licht an der Figur, Laternen). Gemessen in 0-0:
66–81 Zeichenaufrufe inkl. Schattenpass, 120–260 k Dreiecke (Budget 120 / 300 k).
Modellnamen mit Rückfall-Optik im Motor: `coin`, `star`, `stamp`, `checkpoint_flag` (`{active}`), `goal_pole`
(`{flag, grabbed}`), `question_block`, `brick_block`, `used_block`, `crystal_block`, `powerup_*`, `oneup`,
`pipe`, `beanstalk`, `trampoline` (`{squash}`), `boost_arrow`. `pilzling` kommt nur aus der Registry.

### Präzisierung (Motor): Level-Datenformat

- `blocks[].content`: `'coin'` (Standard), `'coins:5'` bzw. `{ coins: 5 }`, Power-up-Name; `coinblock` mit `count`.
- `items`: `{ kind: 'coins', from, to, n }` oder `{ kind: 'coins', pos, r, n }` erzeugt mehrere Münzen;
  `{ kind: 'powerup', pos, power }`.
- `checkpoint`: `[x,y,z]`, `[[x,y,z], …]` oder `{ pos, yaw }`. `goal`: `[x,y,z]` oder `{ pos, height }`
  (Sockel 1 m + Mast, Standard 9 m). `stars`/`stamp`: Punkte oder `{ pos }`.
- Optional `killY` (sonst Level-Umriss − 14 m) und `marks: { name: [x,y,z] }` (benannte Punkte für Tests).
- Bausteine (Parameter je Datei im Kopfkommentar): `island, platform, bridge, stairs, wall, ramp, hill, mound, pipe,
  beanstalk, trampoline, boost, conveyor, mover, water, lava, killplane, deco` (deco-Arten `tree, bush, flower,
  flowers, fence, rock, lantern, post`). Volumen achsenparallel; schräge Brücken werden gestückelt.

### Präzisierung (Motor): Szenen, Speicherstand, Audio, Tests

- Start eines Levels: `scene.start('Course', { id })`. „Zur Weltkarte“, Ergebnis „Weiter“ und Spielende starten
  `'CourseMap'`, sobald diese Szene registriert ist (sonst `'WorldMap'`), mit Daten `{ from: id, done?: id,
  gameOver? }`. Pause: `CourseScene.pauseGame()/resumeGame()/restartLevel()/exitToMap()`.
- `courseSave` (`level/CourseSave.js`): `hero, lives, coins, level(id), peek(id), completeLevel(id, { stars, stamp,
  time, pole })`, `addCoins(n)` (je 100 → Leben), `starsInWorld(w)`, `totalStars()`, `unlocked(id, chain, minStars)`.
  Sterne/Stempel zählen beim Levelabschluss; schon gespeicherte erscheinen im Level durchscheinend.
- Zusätzliche, optionale Effektnamen (stumm, bis es sie gibt): `skid, wallslide, swim, splash, boost, victory,
  powerup_appear, pause`.
- Tests: `tests/course.mjs` (Port 4192, Bewegungsset/Bausteine deterministisch über `step(n)`),
  `tests/course_view.mjs` (Port 4193, Screenshots `tests/out/c_*.png`, Kennzahlen). `__course.setInput({ x, y,
  jump, crouch, run, action })`, `setManual(b)`, `snapCamera()`, `stats()`, `setHero(k)`.

## Welt 1 – Level-Liste und Freischaltung (Hauptsitzung)

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `1-1` | parcours | grass | course_grass | 3 + Stempel | – (offen) |
| `1-2` | parcours (Höhle) | cave | course_cave | 3 + Stempel | 1-1 |
| `1-A` | arena (Gegner-Blockade, optional) | grass/Festung | course_arena | 1 | 1-2 |
| `1-3` | parcours (vertikal) | grass | course_grass | 3 + Stempel | 1-2 |
| `1-Schatz` | diorama (Pflaume, springt nicht) | diorama | course_diorama | 5 | 1-3 |
| `1-4` | Reit-Level (Fluss, Pflaume auf Blatt-Floß) | river | course_river | 3 + Stempel | 1-3 |
| `1-5` | parcours (Zirkus, Kipp-Schaltfelder) | circus | course_circus | 3 + Stempel | 1-4 |
| `1-Burg` | boss (Baron Brummbär, Autobahn) | highway | course_boss | 3 + Stempel | 1-5 **und ≥ 10 Sterne** |

Welt 1 hat damit 24 Sterne. Die Weltkarte (`course_map`) zeigt alle Eingänge; gesperrte sind sichtbar, aber zu.

### Kamera-Richtwerte für Level (Hauptsitzung)

Standard jetzt `pitch 45`, `dist 13`. Für Parcours-Abschnitte **pitch 40–48°, dist 11–14 m** wählen: so bleibt
Tiefe sichtbar (Horizont/Hintergrund am oberen Bildrand), die Heldin ist auf dem Handy groß genug, und Sprünge in
die Tiefe sind lesbar. Steiler (50–58°) nur für enge Sprungpassagen nach unten oder Arenen, flacher (35–40°) für
Ausblicke und Rennstrecken. Wandrutschen: Simulation blickt zur Wand, HeroRig stellt die Kurs-Pose von der Wand
weg dar.

---

## Präzisierung (Gegner/Power-ups)

Ergänzungen des Gegner-/Power-up-Agenten (Stand: Gegnerpark 0-1). Nichts oben Festgelegtes wird geändert. Level-Bauer
schreiben nur Daten; alle Felder unten sind optional, sofern nicht anders vermerkt.

### Präzisierung (Gegner/Power-ups): Dateien

```
src/course/entities/Enemy.js          Basis aller Gegner (erweitert CourseEntity): Zustandsautomat, Laufen, Patrouille,
                                      Verfolgen, Standard-Konter, Beute – auch für Boss-/Arena-Agenten gedacht
src/course/entities/kinds/            pilzling, krallen_pilzling, pilzlingsturm, panzerkroete (+ panzer), schnappblume
                                      (+ riesenschnappblume), rammbock_bulle, kaefer (krabbelkaefer, flatterkaefer),
                                      zauberkroete (+ zauberkugel), brummer, stampfstein, wuehler, kickbombe, fireball,
                                      steinblock (+ blockwand)
src/course/player/powers/             krallen.js, funken.js, riese.js, stern.js  (timed.js entfällt)
src/course/levels/w0/0-1.js           Testlevel „Gegnerpark“ (alle Gegner in Gehegen, alle Power-up-Blöcke)
tests/course_enemies.mjs              Port 4194: Verhalten + Konter je Gegner, Power-ups, Tragen/Werfen, ce_*.png
```

### Präzisierung (Gegner/Power-ups): gemeinsame Felder und Konter

Gemeinsame `spec`-Felder aller Gegner: `id` (→ `level.named`), `pos` (Fußpunkt), `dir` (`[dx, dz]` oder Gier in rad)
bzw. `yaw` (Standard: Blick zur Kamera, +Z), `path` (`[[x,y,z], …]`, Patrouille hin und her; `loop: true` = Runde),
`wake` (m, erst ab dieser Nähe zur Figur aktiv, Standard 18), `edges` (`false` = an Kanten nicht umdrehen),
`drop` (Beute beim Besiegen: `'coin'` | `'coins:N'` | Power-up-Name | `'star:I'`).

Laufzeit-Felder: `state`, `stateT` (s seit Zustandswechsel), `defeated` (true, sobald besiegt), `dir`. Hooks, die eine
Level-Laufzeit (z. B. Arena) setzen kann: `level.onEnemyDefeated(enemy)` (einmal je Gegner; ein zerstörter Panzer und
eine entschärfte Kickbombe zählen nicht), `level.onExplosion(center, radius, bomb)`.

`onHit(kind, source)`-Arten: `fire | claw | shell | throw | bomb | mega | star | pound | bump`. Neu: `bomb`
(Explosion), `throw` (geworfenes Objekt ohne eigene Wirkung – reserviert für Topfpflanze/Schneeball). Standard-Konter
(`Enemy`): draufspringen → platt mit Abprall (`'stomp'`), Stampfattacke von oben → platt (ohne Abprall),
Krallen-Sturzflug → wegfliegen, seitlich → Treffer der Figur; `onHit` → wegfliegen; `pound` (Stampfwelle daneben, `attackArea` 1,4 m) → platt, wenn auf gleicher
Höhe. Funkelstern/Riesentrank besiegen jeden Gegner bei Berührung.

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| pilzling | läuft/patrouilliert; `behavior: 'chase'`: Hüpfer + „!“, verfolgt | Sprung, alles | seitlich |
| krallen_pilzling | läuft; sieht Figur → „!“ (0,4 s), ducken (0,22 s), Sprung 0,5 s auf die Figur | Sprung, alles | seitlich, Sprung |
| pilzlingsturm | 3–5 Stufen, läuft auf die Figur zu | von oben je 1 Stufe; Feuer/Krallen/Panzer je 1; Explosion/Stern/Riese alle | seitlich |
| panzerkroete | läuft | Sprung/Stampfen/Krallen → Panzer; Feuer/Panzer/Explosion → weg | seitlich |
| panzer | liegt; gekickt 10 m/s, prallt an Wänden ab | Panzer, Explosion, Stern, Riese | gleitend seitlich (Rückpraller) |
| schnappblume | schnappt im Takt; trifft nur, wer das sichtbare Maul berührt (Maulspitze ≈ 0,75 m vor der Mitte) | **Draufspringen/Stampfen auf den Kopf** (Abprall), Feuer, Krallen, Sturzflug, Panzer, Explosion, Stampfen neben ihr (auf einer Röhre: Tatzenhieb im Sprung, Stampfen neben einer Röhre ≤ 1,2 m) | Biss, seitliches Hineinlaufen |
| riesenschnappblume | wie oben, ×2,8 (Maulspitze ≈ 2,1 m) | dasselbe, 3 Treffer (1,1 s Pause; Sprünge in der Pause prallen nur ab) | Biss, seitliches Hineinlaufen |
| rammbock_bulle | scharrt 0,8 s, Sturmlauf, bremst an Kanten, Wand → benommen | 3 Treffer (Sprung, Feuer, Krallen …); Explosion/Stern/Riese sofort | seitlich (betäubt harmlos) |
| krabbelkaefer / flatterkaefer | feste Bahn, in Reihe | Sprung, alles | seitlich |
| zauberkroete | erscheint an Punkten, zaubert Kugel, verschwindet | nur sichtbar: Sprung, alles | seitlich, Zauberkugel |
| brummer | Flugbahn/Kreis; „warn“ 0,75 s, Sturzflug | Sprung, alles | seitlich, Stich |
| stampfstein | fällt auf die Figur darunter, liegt, fährt hoch (Oberseite begehbar) | nur Stern/Riese | darunter |
| wuehler | taucht im Takt auf/ab (abgetaucht harmlos) | aufgetaucht: Sprung, alles | aufgetaucht seitlich |
| kickbombe | läuft; brennt nach Berührung, explodiert nach 3 s (2,5 m) | Stern/Riese entschärfen | Explosion |

### Präzisierung (Gegner/Power-ups): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Pilzling: speed 1.6, behavior 'walk'|'patrol'|'chase', sight 7 (chase), chaseSpeed 2.6
  { kind: 'pilzling', pos: [0, 1, -20], path: [[-4, 1, -20], [4, 1, -20]] },
  { kind: 'pilzling', pos: [3, 1, -30], behavior: 'chase', sight: 6 },
  // Krallen-Pilzling: speed 1.8, sight 5.5 (= größte Sprungweite), cooldown 1.4
  { kind: 'krallen_pilzling', pos: [0, 1, -40], dir: [1, 0] },
  // Pilzlingsturm: count 3–5 (4), speed 1.1, behavior 'chase' (Standard) | 'walk', sight 9,
  //   carries 'star:I' (Stern I sitzt sichtbar oben, erst nach dem Fall einsammelbar; LEVEL.stars listet ihn nicht)
  //   | 'coins:N' | Power-up-Name (erscheint beim Fall)
  { kind: 'pilzlingsturm', pos: [0, 1, -50], count: 5, carries: 'star:2' },
  // Panzerkröte: speed 1.4, gold (Goldpanzer), respawn (Standard true: Kröte kommt nach 8 s aus dem Panzer)
  { kind: 'panzerkroete', pos: [0, 1, -60], path: [[-3, 1, -60], [3, 1, -60]], gold: true },
  // Panzer allein: speed 10 (Gleiten), gold, coins 15 (Goldpanzer: je 0,3 s eine), wakeAfter 0 (s, 0 = nie)
  { kind: 'panzer', pos: [2, 1, -62] },
  // Schnappblume: base 'pot'|'ground'|'pipe' ('pot'), yaw (Ruhe-Blick), range 3.4, pause 0.7, hp 1 (Biss-Zone fest am Modell gemessen)
  { kind: 'schnappblume', pos: [4, 2.2, -70], base: 'pipe', yaw: -Math.PI / 2 },   // auf einer Röhre (Höhe 1,2)
  // Riesenschnappblume: base 'ground', range 7, pause 0.9, hp 3
  { kind: 'riesenschnappblume', pos: [0, 1, -90], yaw: -Math.PI / 2 },
  // Rammbock-Bulle: hp 3, sight 11, speed 7.5 (Sturmlauf), drop Standard 'coins:3'
  { kind: 'rammbock_bulle', pos: [0, 1, -100], dir: [0, 1] },
  // Käfer: path (Krabbel: y = Suchhöhe, läuft auf dem Boden; Flatter: y = Flughöhe), loop (ab 3 Punkten true),
  //   speed 2.2 / 2.4, count 1, spacing 1.4 (m entlang der Bahn), phase 0..1, color blue|red|green|yellow|pink
  { kind: 'krabbelkaefer', path: [[-4, 1, -110], [4, 1, -110], [4, 1, -116], [-4, 1, -116]], count: 4, spacing: 1.6 },
  { kind: 'flatterkaefer', path: [[-3, 3.5, -112], [3, 3.5, -112], [0, 3.5, -115]], count: 3, color: 'pink' },
  // Zauberkröte: spots (Fußpunkte, reihum; Punkt < 2,5 m an der Figur wird übersprungen), sight 16, hidden 1.4, linger 0.7
  { kind: 'zauberkroete', spots: [[-4, 1, -120], [4, 1, -120], [0, 1, -126]] },
  // Brummer: path (Flugbahn, y = Flughöhe) | center + radius (2.5) | pos (schwebt); speed 2.4, sight 6, dive 9, cooldown 1.8
  { kind: 'brummer', center: [0, 3.5, -130], radius: 2 },
  // Stampfstein: pos = Mitte der Unterseite in der oberen Ruhelage; size [1.8, 2, 1.8], fall (sonst bis zum Boden),
  //   trigger 1.0 (m über den Fußabdruck hinaus), wait 1.2, rise 2.5
  { kind: 'stampfstein', pos: [0, 4.5, -140] },
  // Wühler: pos.y = Oberfläche, ground 'water'|'earth', path (Bahn, abgetaucht), speed 1.6, hide 1.6, up 1.4, phase 0..1
  { kind: 'wuehler', pos: [0, 0.9, -150], ground: 'water', path: [[-3, 0.9, -150], [3, 0.9, -150]], phase: 0.3 },
  // Kickbombe: speed 1.3, behavior 'walk'|'chase', sight 9, lit, fuse 3, radius 2.5, kickSpeed 9,
  //   vel [vx,vy,vz] (startet im Flug, landet brennend), owner (Entität, die sie nicht trifft, bis die Figur kickt)
  { kind: 'kickbombe', pos: [0, 1, -160], path: [[-3, 1, -160], [3, 1, -160]] },
],
```

Wühler für das Floß (1-4): `e.kind === 'wuehler' && e.up` = aufgetaucht, Hindernis. Brummer, Käfer, Wühler, Blumen,
Bulle und Stampfstein sind immer aktiv (kein `wake`). Der Stampfstein ist eine bewegte feste Form (`mover`,
`camIgnore`); die Kamera springt nicht hinter ihn. Stehen mehrere Stampfsteine hintereinander in Kamerarichtung, kann
der vordere die Figur kurz verdecken – lieber versetzt oder quer zur Kamera anordnen.

### Präzisierung (Gegner/Power-ups): Blöcke

- `steinblock` (grauer „Mega“-Block, `LEVEL.blocks`): `{ kind: 'steinblock', pos, content? }` – fest, Kollisionsform
  mit Flag **`mega: true`** (nicht `breakable`: Stampfen, Kopfstoß, Krallen, Panzer prallen ab). Nur Riesentrank
  (`onHit('mega')`) und Explosionen (`onHit('bomb')`) zertrümmern ihn; `content` erscheint danach.
- `blockwand`: `{ kind: 'blockwand', pos: [x, y, z] (Mitte Unterseite), size: [w, h, d] (ganze Blöcke), block:
  'steinblock' (Standard) | 'brick' | 'crystal' | 'used' | 'question', content? }` → w × h × d Einzelblöcke.
- Ziegel/?-Blöcke (`entities/kinds/blocks.js`) reagieren zusätzlich auf `claw`/`shell` (Ziegel zerbricht, ?-Block gibt
  Inhalt) und `bomb` (Ziegel/Kristall zerbrechen). Bausteine mit eigenen zerbrechlichen Formen setzen `breakable` oder
  `mega` und `owner.onHit(kind, source, shape)` – Tatzenhieb, Riesentrank und Explosion rufen ihn.

### Präzisierung (Gegner/Power-ups): Power-ups

Namen für `blocks[].content`, `items` (`{ kind: 'powerup', pos, power }`), `drop`, `carries` (Aliasse in Klammern):
`wachstumsbeere` (beere), `krallen` (krallenAnzug, claw), `funken` (funkenbluete, fire), `riese` (riesentrank, mega),
`stern` (funkelstern, star), `oneup` (1up, extraleben).

| Power-up | Wirkung | Dauer | HUD (`icon`) | sfx |
| --- | --- | --- | --- | --- |
| wachstumsbeere | klein → groß | – | – | powerup |
| oneup | Leben +1 | – | – | oneup |
| krallen | Klettern an `climbable` (~2 s), Sturzflug (Ducken in der Luft mit Richtung), **Tatzenhieb** (Aktion: 0,3 s, 1,1 m vor der Figur, Ausfallschritt; besiegt Gegner, kickt Panzer/Bomben, zerbricht Ziegel, löst ?-Blöcke) | bis Treffer | 0xffb52e | powerup, claw |
| funken | Aktion: Feuerball (10 m/s, hüpft ≈ 0,55 m, max. 2 gleichzeitig, 1,5 s, verschwindet an Wänden/Wasser; besiegt Gegner, zündet Kickbomben, sammelt Münzen) | bis Treffer | 0xff5a2a | powerup, fireball |
| riese | ×2,4 (nur Darstellung, Hülle bleibt), unverwundbar, zertrümmert `breakable`/`mega`/Block-Formen und Stampfsteine im Riesenkörper, besiegt Gegner, Kamera ×1,4 (`camZoom`) | 10 s, dann 1 s Blinken | 0xc04cff | powerup, powerdown |
| stern | unverwundbar, Berührung besiegt Gegner, Tempo ×1,25, Glitzern, Musik `course_star` (danach `LEVEL.music`, auch nach Tod/Neustart) | 10 s | 0xfff04a | powerup |

Neue `def`-Felder: `camZoom` (Kameraabstand-Faktor, CameraRig blendet weich über `rig.powerZoom`). `level.musicNow` hält
das zuletzt vom Funkelstern gesetzte Thema. Avatar: `proxy.course.power` = Power-up-Name (Kostümfarbe),
`proxy.course.state` meldet `'claw'` während des Tatzenhiebs (`player.clawTime > 0`, 0,3 s) und `'throw'` 0,25 s beim
Werfen bzw. 0,2 s beim Feuerball (`player.throwTime > 0`, Dauer `player.throwDur`); `proxy.course.phase` ist dann der
Fortschritt 0..1 der Aktion (jeder Wurf beginnt von vorn).

### Präzisierung (Gegner/Power-ups): Tragen/Werfen

- Entität: `carryable = true`, optional `canCarry(player) → bool`, `holdStyle = 'over'` (Standard, über dem Kopf) |
  `'front'` (vor der Brust); Hooks `onPickup(player)`, `onThrow(player, { dir: {x, z}, gentle })`, `onDrop(player)`.
  Solange `entity.carrier` gesetzt ist, ruft ihr `update()` `followCarrier()` (Lage = `player.holdPoint(entity, out)`:
  'over' = Fußpunkt auf dem Kopf, 0,12 m vor der Figur; 'front' = vor der Brust; Riesentrank: am großen Körper).
  Getragen `touch = false`. Standard-`onThrow` (CourseEntity): Bogen 8 m/s vor, 5 m/s hoch. Der Avatar bekommt
  `proxy.course.holding = holdStyle` (bzw. `false`) – HeroRig setzt das aus `player.holding`.
- Figur: `player.holding` (Entität | null). Aktion (`actionPressed`) wirft Gehaltenes in Blickrichtung (mit gehaltenem
  Ducken: absetzen), sonst hebt sie das nächste `carryable`-Objekt ≤ 0,75 m vor der Brust auf (Höhe −0,6 … +1 m),
  sonst Power-up-Aktion. Rennen gehalten + seitliche Berührung greift Panzer/Kickbombe (`player.pickUp(e)`). Springen
  mit Last möglich; Treffer, Tod, Neustart, Röhre, Schwimmen und Bohnenranke lassen fallen (`player.dropHeld()` bzw.
  `followCarrier()` → `onDrop`). API:
  `canPickUp()`, `findCarryable()`, `pickUp(e)`, `throwHeld(input)`, `dropHeld()`, `holdPoint(e, out)`.
- Tragbar sind `panzer` (geworfen: gleitet in Blickrichtung) und `kickbombe` (geworfen: Bogen, rollt aus, explodiert
  beim Aufprall). Topfpflanze/Schneeball später nach demselben Muster.

### Präzisierung (Gegner/Power-ups): Kickbombe und Endgegner (`onBombHit`)

- Explosion (`bomb.explode()`): Radius `radius` (2,5 m, Abstand Bombenmitte → Hüllquader): `onHit('bomb', bomb)` für
  alle Entitäten im Radius (Gegner besiegt, Blöcke zertrümmert, andere Bomben zünden mit 0,12 s Lunte), dazu
  `owner.onHit('bomb', bomb, shape)` für Formen mit `breakable` oder `mega`; die Figur wird bis 0,9 × Radius getroffen;
  danach `level.onExplosion(center, radius, bomb)`.
- Eine von der Figur gekickte/geworfene Bombe (`bomb.kicker` gesetzt), die schneller als 3 m/s ist, explodiert beim
  Aufprall an einer Wand oder einer Entität mit `enemy` oder `onBombHit`. Trifft sie eine Entität mit
  **`onBombHit(bomb)`**, wird diese **vor** der Explosion gerufen (Endgegner: Treffer zählen; `bomb.kicker` = Figur).
- Ziele für `onBombHit` müssen `alive`, nicht `defeated` und `touch !== false` sein (Hüllquader `pos`/`half` zählt).
- Endgegner wirft Bomben: `level.spawn('kickbombe', { pos, vel: [vx, vy, vz], owner: boss | 'boss-id', fuse? })` – fliegt, landet
  brennend, trifft den Werfer nicht, bis die Figur sie kickt (Berührung = Kick weg von der Figur, leicht in ihre
  Blickrichtung; 9 m/s). Im Flug ist sie für die Figur harmlos. Der Boss kann `onHit('bomb')` (Explosion in der Nähe)
  ignorieren, wenn nur direkte Treffer (`onBombHit`) zählen sollen.

### Präzisierung (Gegner/Power-ups): Tests

`tests/course_enemies.mjs` (Port 4194, `?course=0-1&scale=2&adapt=0`): 75 Prüfungen, deterministisch über `step(n)` /
`setInput`; Hilfen in der Seite `window.__t` (`place`, `stomp`, `side`, `action`, `ent(id)`, `count`). Danach frisches
Level und Screenshots `tests/out/ce_*.png` (je Gegner in Aktion, Riese, Stern, Feuerbälle, Tragen); gewartet wird auf
neue Bilder (`view.frame`), nicht auf feste Zeiten.

## Präzisierung (Archetypen, Hauptsitzung)

Archetypen mit eigener Logik liegen unter `src/course/archetypes/kinds/<name>.js` und exportieren
`ARCHETYPES = { name: (scene) => instance }` (Registry `archetypes/index.js`, automatisch). `LEVEL.archetype`
wählt sie. Haken der Instanz (alle optional): `createPlayer(level, opts)`, `createRig(view, player)`, `setup()`,
`beforeStep(dt, input)`, `afterStep(dt, input)`, `render(dt, t)`, `camera(dt, player, world) → true` (eigene
Kamera, ersetzt `CameraRig.update`), `info()` (erscheint in `__course.state().archetype`), `dispose()`.
`level.archetype` zeigt auf die Instanz. Sterne: `LevelRuntime` speichert jetzt `max(3, LEVEL.stars.length)`
Sterne (Diorama 5, Arena 1 → im HUD/Ergebnis die tatsächliche Zahl zeigen).

---

## Präzisierung (Weltkarte)

Ergänzungen des Weltkarten-Agenten (Stand: Welt 1). Nichts oben Festgelegtes wird geändert.

### Präzisierung (Weltkarte): Dateien und Szene

```
src/course/map/
  CourseMapScene.js   Phaser-Szene 'CourseMap' (Karte als besonderes Level, archetype 'map')
  worlds/index.js     Registry der Weltkarten (import.meta.glob ./w*.js) → getWorldMap(n), listWorldMaps()
  worlds/w1.js        Welt 1 „Grüne Blockinsel“ (reine Daten, export const MAP)
  layout.js           Grundriss aus den Daten: begehbares Raster, Schranken-Rechtecke, Rückkehrpunkte, Erreichbarkeit
  walkgrid.js         Raster des begehbaren Bereichs (0,5 m), Randkanten → unsichtbare Wände, Flutfüllung
  unlock.js           Freischaltung (pathOpen, unlocked, reason, worldStars, levelProgress) – rein, Node-tauglich
  MapBuilder.js       Kartenbau: Gelände, Standard-Bausteine, Hecken/Zäune, Wände, Platten-Wege, Eingänge, Schranken, Haus
  MapBatcher.js       verschmilzt die statische Karten-Geometrie in 32×32-m-Kacheln (view.addStatic wird während des
                      Kartenbaus umgeleitet – besseres Culling auf der breiten Insel, auch im Schattenpass)
  entrances.js        Eingangs-Podest (Nummernscheibe, Schloss, Leuchtring, Fahne) + Kulisse je Art
  gates.js            Schranke aus Steinblöcken (Kollision, Versink-Animation im Simulationstakt)
  entities.js         MapRoamer (wandernde Gegnergruppe), MapItem (Gratis-Power-up) – ohne Entitäten-Registry
  MapRuntime.js       Ersatz für LevelRuntime: kein Timer, keine Lebensverluste, Rückkehr zum sicheren Punkt
  MapHud.js           Karten-HUD (Phaser) inkl. Touch-Steuerung (CourseTouch)
  props.js            3D-Requisiten (Build-Geometrien, Canvas-Texturen)
  scenery.js          Thema 'map' (meldet sich in THEMES an), Meer, Schaum, Glitzern, Wolken, Nachbarinseln
```

Die Karte nutzt die Level-Infrastruktur unverändert: `Level` (Kollisionswelt, Entitäten, `step`), `CourseView`
(Renderer, Kamera-Rig mit `camera`-Schiene, Licht, Himmel, Schatten), `Player` + `HeroRig`, `CourseInput` +
`CourseTouch`, fester Zeitschritt 1/120 s. Die Spielfigur hat auf der Karte das volle Bewegungsset.
Standard-Bausteine aus `segments` (water, bridge, stairs, platform, deco …) werden über `getBlockType` gebaut;
Kartenelemente baut `MapBuilder` selbst (keine Einträge in `blocks/types` oder `entities/kinds`).

Test-Schnittstelle `window.__courseMap` (= Szene): `step(n)`, `setInput(o)`, `setManual(b)`, `teleport(x, y, z, yaw?)`,
`state()` (Figur, `onPad`, `near`, Eingänge mit `locked/reason/enterable/soon/done/stars/starsMax/stamp/title`,
Schranken `closed|opening|open`, `carryPower`, `berry`, `roamers`, Sterne, `lastStart`, `goVisible`), `enter()`
(wie Enter), `pressGo()` („Los!“), `selectHero(k)`, `toggleMute()`, `toClassic()`, `resetSave()`, `status(id)`,
`stats()`, `snapCamera()`; `window.__courseSave` = Speicherstand. Test: `tests/course_map.mjs` (Port 4194).

### Präzisierung (Weltkarte): Weltdaten-Format (für Welt 2+)

Neue Welt = neue Datei `src/course/map/worlds/w<n>.js` mit `export const MAP = { … }` (Koordinaten wie Level:
Meter, Y oben, Kamera blickt nach −Z; der Weg führt von Süden (+Z) nach Norden (−Z)):

```js
export const MAP = {
  id: 'karte-2', world: 2, title: 'Wüste', archetype: 'map', theme: 'map', music: 'course_map',
  base: -3, sea: 0,                                   // Unterkante der Geländeblöcke, Meereshöhe
  spawn: { pos: [x, y, z], yaw },                     // Startpunkt (ohne Rückkehr/gemerkte Lage)
  camera: [{ from: 200, to: -300, pitch: 52, dist: 17, fov: 40, ahead: 2.4 }],   // Kameraschiene wie im Level
  levels: [                                           // Freischaltung (Reihenfolge = Weg)
    { id: '2-1', after: '1-Burg', stars: 3, stamp: true },
    { id: '2-A', after: ['2-1'], stars: 1 },          // after: Id oder Liste (alle geschafft)
    { id: '2-Burg', after: '2-5', minStars: 20, stars: 3, stamp: true },  // minStars: Sterne dieser Welt
    { id: 'W3', after: '2-Burg', world: 3, label: 'Welt 3', next: 3, stars: 0 },  // Übergang (Glasröhre)
  ],
  ground: [{ rect: [x0, z0, x1, z1], top, walk?: true, style?: 'grass'|'rock'|'meadow'|'pond'|'sand', noDeco?, noEdge? }],
  walk: [[x0, z0, x1, z1]],                           // zusätzlich begehbar (Brücken, Treppen, Teich, Steg)
  paths: [[[x, z], …]],                               // helle Platten-Wege (2 m), auf Treppen/Brücken ausgelassen
  entrances: [{ id, kind, pos: [x, y, z], decor?: [x, y, z], exit?: [x, y, z], labelY?, cage?, waterfall?, pipe? }],
  gates: [{ for: '2-2', at: [x, z], axis: 'x'|'z' }], // Schranke quer über die Engstelle; axis = Laufrichtung
  roamers: [{ level: '2-A', model: 'name', count: 2, from: [x, y, z], to: [x, y, z], speed }],
  houses: [{ kind: 'beeren', pos, yaw, item: [x, y, z], items: ['krallen', 'funken'] }],
  signs: [{ pos: [x, y, z], yaw, text: 'Welt 2\nWüste' }],      // Holzschilder
  intro: { from: [x, y, z], look: [x, y, z], duration: 3 } | false,  // Anflug beim Betreten (Standard: von Süden)
  segments: [ /* Standard-Bausteine wie im Level-Format */ ],
};
```

- Nicht begehbare Grasblöcke bekommen automatisch Bäume, Büsche, Blumen (`noDeco` schaltet ab); `noEdge` an einem
  Block unterdrückt Hecke/Zaun an angrenzenden Rändern (z. B. Sandstrand).
- **Begehbar** ist nur die Vereinigung der Rechtecke `ground[].walk` + `walk` (achsenparallel, Raster 0,5 m). An allen
  Rändern entstehen unsichtbare, 40 m hohe Wände (`camIgnore`, `noWallSlide`); wo daneben gleich hohes oder bis 3,5 m
  höheres Gelände liegt, setzt der Bau eine Hecke, an Abbrüchen zu tieferem Land einen weißen Zaun, am Meer nichts.
- **Schranken** sperren je eine Engstelle; sie müssen ihren Bereich vollständig abriegeln (geprüft per Flutfüllung in
  `tests/course_map.mjs`: mit offenen Schranken genau zu den freien Wegen erreichbar sind genau die passenden Eingänge).
  Bereiche gleicher Höhe dürfen sich nur über eine Engstelle mit Schranke berühren (Höhenunterschiede zählen nicht – die
  Figur springt bis 6 m).
- `kind` der Eingänge (Kulisse): `meadow` (Blumentor), `cave` (Höhlenmaul, `decor` an der Felswand), `arena` (Gitter
  `cage: [[x0,z0,x1,z1], …]`), `beanstalk`, `diorama`, `river` (Blatt-Floß bei `decor`, `waterfall: { x0, x1, z, top,
  bottom }`), `circus`, `castle` (Festung mit Baron-Flagge), `pipe` (Glasröhre, Verlauf `pipe: [[dx, dy, dz], …]`).
- Nummer auf der Scheibe = `levels[].label ?? id`; Titel = `getLevel(id)?.title`, sonst „Bald“.

### Präzisierung (Weltkarte): Freischaltungs-API

`src/course/map/unlock.js` (reine Funktionen, `save` = `courseSave`):
`pathOpen(map, save, id)` (alle `after` geschafft → Schranke weg), `reason(map, save, id)` → `null` | `'locked'` |
`'stars'`, `unlocked(map, save, id)` (= `reason === null`), `worldStars(map, save)` (= `save.starsInWorld(map.world)`),
`worldStarsMax(map)`, `levelProgress(save, id)` → `{ done, stars, starFlags, stamp }`.
Ein Eingang ist **startbar**, wenn er frei ist und `getLevel(id)` existiert; sonst zeigt er „Bald“ (bzw. „Noch nicht
frei“ / „Benötigt N Sterne (x/N)“). Frisch frei gewordene Wege: Beim nächsten Kartenbesuch schwenkt die Kamera zur
Schranke, die Blöcke versinken, das Podest hüpft; danach steht die Id in `mapOpened` (keine zweite Animation).

### Präzisierung (Weltkarte): Startfluss

- Ohne Parameter startet das Spiel auf der **Kurs-Weltkarte** (`CourseBootScene` → `'CourseMap'`); ohne 3D-Darstellung
  (`?r3d=0`, kein WebGL2) auf der Klassik-Karte. `?map=1` Kurs-Karte, `?classic=1` Klassik-Weltkarte,
  `?course=<id>` Kurs-Level direkt, `?level=<key>` Klassik-Level direkt.
- Karte → Level: auf einem freien Podest A / Leertaste / Enter, Touch: großer „Los!“-Knopf (erscheint nur dort) →
  `scene.start('Course', { id })`. Die Gegnergruppe startet ihr Level bei Berührung (wenn frei).
- Level → Karte: `scene.start('CourseMap', { from, done?, gameOver? })` (Motor). Die Figur steht vor dem Eingang
  (`exit` bzw. 2,6 m Richtung Kamera), blickt zur Kamera; `done` zeigt „… geschafft!“, `gameOver` einen Hinweis.
- Beim Betreten einer Welt (nicht nach einem Level) fliegt die Kamera aus einer flachen Ansicht mit Himmel, Sonne und
  Wolken zur Heldin (≈3 s, jede Eingabe überspringt; Weltname wird eingeblendet).
- Karten-HUD: Leben, Bitcoins, Sterne der Welt (gesammelt/möglich), Porträts Lotti/Greta (Tab), Ton (M), „Klassik“
  (→ `'WorldMap'`), „Neu“ (Spielstand des Kurs-Modus löschen, mit Rückfrage). Die Klassik-Karte hat den Knopf „3D-Kurs“.
- Testparameter `?mapAlias=1-1:0-0,…`: Eingang startet ein Ersatz-Level (solange es das echte noch nicht gibt); das
  Ergebnis wird bei der Rückkehr auf den Eingang übertragen.

### Präzisierung (Weltkarte): Speicherstand (additiv) und `carryPower`

Neue Felder in `lotti-greta-course-v1`: `carryPower` (Power-up-Name oder `null`), `mapVisit` (Zähler der
Kartenbesuche), `berryVisit` (Besuch der letzten Beerenhaus-Nutzung), `mapOpened` (Ids mit geöffneter Schranke),
`mapPos = { world, pos, yaw, entrance?, level? }` (Lage auf der Karte; `entrance`/`level` = zuletzt betretener Eingang
und das gestartete Level, damit die Rückkehr den richtigen Eingang findet). Methoden: `carryPower` (get/set),
`takeCarryPower()`, `beginMapVisit()`, `berryAvailable()`, `useBerry()`, `mapOpened(id)`, `markMapOpened(id)`,
`setMapPos(world, pos, yaw, extra)`, `mapPos`.

**Beerenhaus:** einmal je Kartenbesuch ein Gratis-Power-up (Welt 1 abwechselnd Krallen-Anzug / Funkenblüte). Berühren
→ `carryPower` gesetzt, die Heldin trägt es schon auf der Karte. **Levelstart:** `CourseScene.create()` ruft
`courseSave.takeCarryPower()` und `player.setPower(name)` – das Power-up gilt im nächsten Level ab dem Start und ist
danach verbraucht (Neustart/Tod: wie gewohnt ohne Power-up). Level, deren Archetyp eine eigene Spielfigur baut
(`createPlayer`, z. B. Diorama mit Pflaume), lösen es nicht ein – es bleibt fürs nächste Level im Gepäck.

## Präzisierung (Sonder-Bausteine)

Ergänzung des Bausteine-Agenten (Stand: Bausteinpark 0-2). Alle Sonder-Bausteine für Welt 1 sind parametrierbare
Module; Level-Bauer setzen sie nur in Daten ein. Jede Datei dokumentiert ihre Parameter im Kopfkommentar.

### Präzisierung (Sonder-Bausteine): Wo was liegt

- Bausteine (`segments`, `type`): `blocks/types/` `glasspipe, switchtiles, hiddenchain, cloud, cloudcannon, fallplatform,
  clawwheel, megawall, room, crystalfloor, appear, sign, river, riverrock` – und `gimmicks.js`: alle Entitäts-Gimmicks sind auch als
  `type` in `segments` erlaubt (`{ type: 'pow', … }` ≙ `{ kind: 'pow', … }`).
- Entitäten (`items`/`blocks`/`enemies`, `kind`): `entities/kinds/` `lantern, pow, starring, timering, pswitch, bluecoin,
  starcoin, bunny, endlessblock, rouletteblock, warpbox, task, crate, chest, spotter, pixelegg, megacolumn, itemtree,
  raft, speedwave` (auch als `type` in `segments`: alle außer bluecoin/starcoin/megacolumn über `gimmicks.js`).
- Gemeinsame Hilfen: `entities/gimmick.js` (Aktionen/Belohnungen, Basisklasse `Gimmick` mit `hidden`/`reveal()`,
  Zeitanzeige über der Figur, Flug-Steuerung für Kanonen, `collectNear`, `visDt`).
- Modelle: `models/kinds/gimmicks.js` (`crate, chest, push_switch, star_ring, star_coin, endless_block, roulette_block,
  warp_box, cloud_cannon, claw_wheel, mega_block, pixel_egg, item_tree, leaf_raft`); genutzt werden außerdem
  `glass_pipe_segment` (Glas-Look), `switch_tile, lantern, pow_block, hidden_block, crystal_block, time_ring, coin_blue,
  bunny_small, fairy_spotter, question_block, used_block, river_rock, speed_wave` und der `PflaumeAvatar` im Kurs-Modus (`course.state` `'ride'`/`'idle'`, `course.rider`).
- Übungslevel `levels/w0/0-2.js` „Bausteinpark“ (je Gimmick eine Station mit Schild, Kameraschiene, `marks`),
  Test `tests/course_blocks.mjs` (Port 4195, Bilder `tests/out/cb_*.png`).

### Präzisierung (Sonder-Bausteine): Ereignisse und Belohnungen (Aktion)

Ein Format für `onAll`, `reward`, `onDone`, `onLit`, `onFull`, `onBreak`, `task.reward`, Inhalte von Kiste/Truhe/Baum:
`{ reveal: id|[ids], hide, start|path (bewegte Plattform startet), stop, drop (Plattform stürzt), star: index |
{ index, pos }, spawn: { kind, … } | [ … ], power: name, coins: n, sfx, pos }` – auch als Liste. Kurzformen: `'coin'`,
`'coins:5'`, `'star:1'`, Power-up-Name, Zahl. Ziele sind benannte Objekte (`level.named`, Daten-`id`).
Sterne, die erst durch ein Gimmick erscheinen sollen: in `LEVEL.stars` als `{ pos, hidden: true, id }` eintragen
(Index bleibt stabil) und per `{ reveal: id }` oder `{ star: index }` zeigen; ohne Eintrag erzeugt `{ star: i }`
den Stern am Auslöser. Jede Entität/Baustein-Entität mit `hidden: true` erscheint per `reveal`.

### Präzisierung (Sonder-Bausteine): Motor-Ergänzungen

- `player.ride(ctl, { state, kind })`: gesteuerter Ablauf im Skript-Modus; `ctl.step(player, dt, input) → true` am
  Ende, danach `ctl.exit(player)` (Austrittsgeschwindigkeit), Figur ist dann in der Luft. Genutzt von Glasröhre,
  Glasrohr-/Wolkenkanone. Berührungen ruhen im Skript-Modus → Münzen sammelt der Baustein (`collectNear`).
- `Player.land`: Formen mit `breakable: 'bomb'` werden durch Stampfen nicht zerbrochen (graue Blockwand).
- `coin`: `hiddenUntilLit` / `hidden` + `reveal()`/`conceal()`; `coins` reicht die Flags weiter. `star`: `hidden` +
  `reveal(pos?)`.
- `player.mount(m)` / `dismount(vx, vy, vz)`, Modus `mount` (Reittier): `m.control(player, dt, input, want)` bewegt
  Reittier und Figur (Rückgabe false → absteigen), optional `m.bounce(input)` (Draufspringen im Sattel), `m.onDismount`.
  Berührungen laufen normal; Treffer im Sattel kosten nur Power-up/Größe (kein Rückstoß). `HeroRig` setzt dann
  `proxy.mount` (Reitpose der Heldin). Genutzt vom Blatt-Floß.
- `mover`: `id` → `level.named` `{ pm, mover, shape, origin, start(), stop() }`, `idle: true` (wartet auf Signal),
  `once: true` (fährt einmal bis zum Ende). `deco` Baum: `climbable: true` (Stamm mit Krallen kletterbar).
- Angriffe, auf die Gimmicks reagieren: `onHit` `'bomb'` (über `level.attackArea(pos, r, 'bomb')`, z. B. Kickbombe),
  `'mega'` (Riesentrank), `'pound'`, `'claw'`, `'fire'`, `'bump'` (POW wirft Gegner um, `flying = true` schützt).

### Präzisierung (Sonder-Bausteine): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Parameter | Beispiel |
| --- | --- | --- | --- |
| `glasspipe` | Figur gleitet durchs Glasrohr; Gabelung per Stick; Kanonen-Ende; Münzen; optional Gegner durchspülen | `path` (Catmull-Rom), `radius` 1, `speed` 12, `oneWay`, `enter`, `branches: [{ at, path, cannon?, enter? }]`, `cannon: { target, arc }`, `exitSpeed` 7, `coins`, `solid`, `flush` | `{ type: 'glasspipe', path: [[0,2,-10],[0,2,-18],[6,3,-24]], coins: 4, branches: [{ at: 1, path: [[-6,2,-22]] }], cannon: { target: [12,1,-44], arc: 6 } }` |
| `switchtiles` | Kipp-Schaltfelder, alle an → Ereignis; Perlen-Tafel als Fortschritt; Wechselschalter; auf fahrender Plattform | `grid`/`tiles`, `pos`, `toggle`, `onAll`, `at`, `indicator`, `on` (mover-Id), `platform` (eigener mover), `id` | `{ type: 'switchtiles', pos: [0,1,-20], grid: [3,2], onAll: { reveal: 'weg1' } }` |
| `appear` | erscheinender Weg (Teile ploppen nacheinander auf, vorher Umrisse) | `id`, `parts: [{ pos, size }]`, `style`, `delay`, `hint`, `visible` | `{ type: 'appear', id: 'weg1', parts: [{ pos: [0,1,-30], size: [2,0.5,2] }] }` |
| `lantern` | Anfassen → Licht, zeigt Münzen mit `hiddenUntilLit` im Radius; optional Brenndauer | `radius` 6, `duration` 0, `hanging`, `lit`, `onLit` | `{ kind: 'lantern', pos: [3,0,-40], radius: 7 }` + `{ kind: 'coins', from, to, n, hiddenUntilLit: true }` |
| `hiddenchain` | unsichtbare Blockkette: jeder Block erscheint, wenn der vorige betreten (bzw. gestoßen) wird | `blocks`, `lead: { pos, size }` (länglicher ?-Block), `trigger` 'step'/'bump', `hint`, `onDone` | `{ type: 'hiddenchain', lead: { pos: [0,1,-40], size: [3,1,1] }, blocks: [[2.5,3,-41],[4.5,5,-42]] }` |
| `room`, `crystalfloor` | Raum mit Ausschnitt-Ansicht (Decke/Vorderwand blenden aus), Kristall-Luke (Stampfen öffnet) | `pos`, `size`, `open`, `door`, `hatch: { at, size }`, `top`, `ceiling`, `cutaway` | `{ type: 'room', pos: [0,1,-40], size: [6,3,6], top: 'grass', hatch: { size: [2,2] } }` |
| `warpbox` | in die Box springen → Teleport (Box/Röhre/Punkt) und zurück; Rätselbox mit Aufgabe | `id`, `target`, `style` 'warp'/'mystery', `task`, `onEnter`, `hidden` | `{ kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [6,1,-80], target: 'rb2' }` |
| `task` | Aufgabe im Bereich: alle Gegner besiegt → Belohnung (Rätselbox, Arena 1-A) | `area: { min, max } \| { pos, r }`, `ids`, `star`/`reward`, `pos` | `{ kind: 'task', area: { pos: [0,1,-20], r: 11 }, star: 0 }` |
| `pow` | Erschütterung: Gegner am Boden besiegt, Ziegel/Kisten zerbrechen, 3 Benutzungen | `uses` 3, `radius` 8, `height` 3, `onUse` | `{ kind: 'pow', pos: [2,4,-60], radius: 9 }` |
| `cloud` | Wolkenplattform (Einweg), optional fahrend | `size`, `oneWay`, `path`, `speed`, `id`, `idle` | `{ type: 'cloud', pos: [0,4,-30], size: [3,0.6,3] }` |
| `cloudcannon` | auf die Öffnung springen → Flug in den Münzhimmel | `target`, `arc` 4, `onFire` | `{ type: 'cloudcannon', pos: [-6,1,-90], target: [-6,40,-100] }` |
| `starring`, `timering`, `pswitch` | Auslösen → Sternmünzen/blaue Münzen für `time` s (Zeitanzeige über der Figur); alle → Belohnung; Zeit um → Münzen weg, neuer Versuch | `coins` (Liste/Strecke/Kreis), `time` 10, `star`/`reward`, `yaw`, `retry` | `{ kind: 'starring', pos: [0,0,-20], star: 0, coins: { from: [-4,0.3,-26], to: [4,0.3,-34], n: 8 } }` |
| `bunny` | Fang-Hase flieht mit Haken im Bereich; fangen → Belohnung; `size: 'big'` → Riesentrank | `area`, `speed`, `alert`, `star`/`reward`, `size` | `{ kind: 'bunny', pos: [8,0,-70], star: 1, area: { pos: [8,0,-70], r: 6 } }` |
| `endlessblock` | Münzen, solange in kurzer Folge getroffen (Zeit-Perlen) | `window` 1.2, `max` 40 | `{ kind: 'endlessblock', pos: [0,3.4,-12] }` |
| `rouletteblock` | Inhalt wechselt im Takt, Treffer gibt den gezeigten | `contents`, `period` 0.5 | `{ kind: 'rouletteblock', pos: [4,3.4,-30], contents: ['krallen','funken','oneup'] }` |
| `fallplatform` | wackelt 0,8 s nach Betreten, fällt (trägt mit), kommt nach 4 s wieder; Signal `drop` | `size`, `delay`, `respawn`, `trigger` 'stand'/'signal', `id` | `{ type: 'fallplatform', pos: [0,4,-50], delay: 0.8, respawn: 4 }` |
| `clawwheel` | mit Krallen hochklettern dreht das Rad → Plattformen fahren aus | `size`, `face`, `radius`, `platforms: [{ pos, size, dir, length }]`, `climb` 3, `retract`, `onFull` | `{ type: 'clawwheel', pos: [0,1,-70], size: [3,7,1], platforms: [{ pos: [0.5,4,-70], size: [2.5,0.5,1], dir: [1,0], length: 3.5 }] }` |
| `megawall` | graue Blockwand, nur Bombe/Riesentrank (`breakable: 'bomb'`) | `size` (ganze m), `breakable`, `onBreak` | `{ type: 'megawall', pos: [4,1,-88], size: [4,3,1] }` |
| `crate`, `chest` | Holzkiste (Feuer/Tatze/Stampfen von oben/POW/Bombe, fällt ohne Halt); Truhe (berühren öffnet) | `content`, `size`; Truhe `yaw`, `hidden` | `{ kind: 'crate', pos: [-4,0,-60], content: 'star:1' }` |
| `itemtree` | Baum mit Versteck: Berühren → Inhalt fällt aus der Krone | `content` 'krallen', `size`, `color` | `{ kind: 'itemtree', pos: [-6,0,-62], content: 'krallenAnzug' }` |
| `spotter` | Kobold mit Fernglas (Deko), schaut der Figur nach | `yaw`, `range`, `cheer`, `scale` | `{ kind: 'spotter', pos: [-7,4.2,-6] }` |
| `pixelegg` | Pixel-Relief der Heldin erscheint nach `wait` s Stillstehen im Auslösebereich | `trigger: { pos, r }`, `wait` 4, `hero`, `reward` | `{ kind: 'pixelegg', pos: [0,6,-12.4], trigger: { pos: [0,6,-11], r: 2 } }` |
| `sign` | Holzschild mit Aufschrift | `text`, `yaw`, `size`, `post` | `{ type: 'sign', pos: [-4,1,-2], text: 'Glasröhre' }` |
| `river` | Fluss mit Strömung (1-4): schwimmbares Wasser, Fließ-Streifen, Bett und Ufer auf 1-m-Raster (Kehren schließen sich), Wasserfälle; `level.rivers`, `flowAt`, `surfaceAt` | `path` (y = Oberfläche), `width` 8, `depth` 2.5, `speed` 4 / `speeds`, `bed`, `banks`, `bank` 3, `bankH` 1, `open: ['start','end']` | `{ type: 'river', id: 'fluss', path: [[0,0.6,-12],[0,0.6,-46],[12,0.6,-46],[12,-5.4,-47],[12,-5.4,-80]], open: ['start'] }` |
| `raft` | Blatt-Floß mit Pflaume: aufspringen → reiten (Strömung trägt, Stick lenkt, Sprung hüpft, Schanzen, Wasserfall-Absturz), Strand/`exit` → absteigen; wartet ohne Reiterin; nach Neustart am nächsten Flusspunkt | `steer` 4, `jump` 9.5, `exit`, `exitR` 3, `yaw` | `{ kind: 'raft', pos: [0,0.6,-15.5] }` |
| `speedwave` | Temposchwelle: Floß darüber → kurz schneller | `dir` (Standard Strömung), `boost` 7, `time` 1.4 | `{ kind: 'speedwave', pos: [0,0.6,-21] }` |
| `riverrock` | Flussfelsen (Hindernis) | `size` | `{ type: 'riverrock', pos: [-2.6,0.6,-26] }` |

Schanzen im Fluss: normaler `ramp`-Baustein, der aus dem Wasser steigt (das Floß fährt hinauf und hebt am Ende mit
der Steiggeschwindigkeit ab). Fluss/Floß brauchen keinen Archetyp; ein Reit-Archetyp (1-4) kann die Figur in
`setup()` direkt in den Sattel setzen: `player.mount(level.named.get('floss'))` (Daten-`id` des Floßes). Gemessen im Bausteinpark (scale 2): 72–108 Zeichenaufrufe inkl. Schattenpass,
165–290 k Dreiecke.

### Präzisierung (Sonder-Bausteine): Welt 1 – Gimmick → Baustein

| Level | Gimmick laut Bauplan | Bausteine |
| --- | --- | --- |
| 1-1 | Glasrohre (obere Route, zur Zielfahne), Krallen-Anzug im Baum, großer Hase mit Riesentrank, kleiner Hase am Teich, Warp-Röhre zum Stempel-Raum, Tunnel mit Holzkisten, Steinblöcke hinter der Brücke (Riesentrank) | `glasspipe`, `itemtree`, `bunny` (`size: 'big'` / klein mit `star`), `pipe` + `room`, `crate`, `megawall` |
| 1-2 | Laternen machen Münzen sichtbar, Kristallblöcke → versteckter Raum, Wolkenaufstieg, unsichtbare Blockkette vom länglichen ?-Block, Rätselbox (zwei Panzerkröten → Stern), Glasrohr in der Wand, Welt-Warp-Röhre | `lantern` + `hiddenUntilLit`, `room` (`hatch`) / `crystalfloor`, `cloud`, `hiddenchain` (`lead`), `warpbox` (`mystery`, `task`), `glasspipe`, `pipe` |
| 1-A | Stern erscheint, wenn beide Rammbock-Bullen besiegt sind | `task` |
| 1-3 | Feenwesen mit Ferngläsern, Baum hochklettern, POW-Blöcke legen eine Röhre frei, P-Schalter mit blauen Münzen, Wolkenkanone in den Münzhimmel, Warp-Box zum Ziel nach dem Zwischenboss | `spotter`, `deco` Baum `climbable`, `pow` + `brick` + `pipe`, `pswitch`, `cloudcannon` + `cloud`, `warpbox` (`hidden`, per `task` `{ reveal }`) |
| 1-4 | Fluss mit Reittier, Temposchwellen, Sprungrampe, Zickzack-Kehren, bunter Wasserfall-Abzweig, Absturz, Strand | umgesetzt mit Archetyp `ride` und Kurvenfluss `river` (`channels`), `river_wave`, `river_ramp`, `riverrock`, `river_fall` (Präzisierung Ritt/Diorama); `raft`/`speedwave` bleiben Gimmick für Parcours |
| 1-5 | Schaltfelder → Weg erscheint, Schaltfelder auf schwebenden/fahrenden Plattformen, Roulette-Block, Rätselbox → Kistenraum, Wechselschalter-Plattform, Glasrohr-Kanone zur Zielfahne, letzte Plattform stürzt ab | `switchtiles` + `appear`, `switchtiles` (`platform`/`on`, `toggle`), `rouletteblock`, `warpbox` + `room` + `crate`, `glasspipe` (`cannon`), `fallplatform` (`trigger: 'signal'`, `{ drop }`) |
| 1-Burg | Sternenring (acht Sternmünzen), Krallenrad, graue Blockwand (Kickbombe), Easter-Egg-Pixelfigur, Warp-Box | `starring`, `clawwheel`, `megawall`, `pixelegg`, `warpbox` |
| 1-Kapitän | fahrende Plattformen | `mover` (`idle`/`once`/`id`) – umgesetzt als `1-Schatz`, Archetyp `diorama` |

Nicht Teil der Sonder-Bausteine: Gegner, Kickbomben, Kanonen, Stampfsteine, Bosse, Pilzlingsturm (Gegner-Agent),
„Figur springt nicht“ im Diorama und die fahrende Bossstraße.

## Präzisierung (Ritt/Diorama)

Ergänzung des Pflaume-Agenten (Stand: Level `1-4` „Pflaumes Wildwasserfahrt“ und `1-Schatz` „Pflaume und der
Wolkenwürfel“). Nichts oben Festgelegtes wird geändert. Beide Archetypen sind für spätere Welten wiederverwendbar
(Welt 3/5 Kapitäns-Dioramen, weitere Fluss-Ritte): neue Level brauchen nur Daten.

### Präzisierung (Ritt/Diorama): Dateien

```
src/course/archetypes/kinds/ride.js     Archetyp `ride`: RideController, RideRig, RideCamera, Checkpoints im Fluss,
                                        Musik-Energie-Ebene (music.setDrums) beim Reiten, Blasen vor Wühlern
src/course/archetypes/RiverNet.js       Fluss-Netz (reine Mathematik): Kanäle, Strömung, Ufer-Korridore, Felsen, Rampen, Wellen
src/course/archetypes/RideController.js Spielfigur (Unterklasse von Player): zu Fuß = Player, auf dem Floß eigene Physik
src/course/archetypes/RideRig.js        Pflaume (paddle) + Heldin (ride) auf dem Blatt-Floß; an Land hoppelt Pflaume hinterher
src/course/archetypes/RideCamera.js     Verfolgerkamera entlang der Strömung, Seitenkamera beim Klippensturz
src/course/archetypes/kinds/diorama.js  Archetyp `diorama`: DioramaController, PflaumeRig, OrbitCamera, Schatzstellen, Sieg
src/course/archetypes/DioramaController.js  Pflaume als Schatzsucherin (springt nicht, 3,5 m/s)
src/course/archetypes/PflaumeRig.js     PflaumeAvatar mit gear 'lamp' (idle/walk/run/jump/dig/victory)
src/course/archetypes/OrbitCamera.js    frei drehbare Kamera um den Diorama-Mittelpunkt (2 Zoomstufen)
src/course/archetypes/DioramaDeco.js    Zier der Dioramen (Häuschen, Pilze, Wimpel, Schatzkreuze, Wolkenmeer, Inselchen)
src/course/blocks/types/river.js        Baustein `river` (zwei Formen, s. u.) + riverrock, river_ramp, river_wave, river_fall,
                                        river_arch, river_cliff, river_deco
src/course/view/theme_river.js, theme_diorama.js   Themen `river`, `diorama` (je eine Registrierzeile in themes.js)
src/course/levels/w1/1-4.js, 1-Schatz.js
tests/course_w1_pflaume.mjs             Port 4197, Bilder tests/out/w1p_*.png
```

### Präzisierung (Ritt/Diorama): ein Fluss, zwei Steuerungen (Entscheidung)

Der Sonder-Bausteine-Agent hat parallel ein Gimmick-Floß gebaut. Festgelegt ist jetzt **ein** Baustein `river`
(`blocks/types/river.js`) mit zwei Datenformen, beide tragen sich in `level.rivers` ein (`nearest, contains, surfaceAt,
flowAt, width`):

| Form | Daten | Physik | Wofür |
| --- | --- | --- | --- |
| Kurvenfluss | `channels: [{ id, points: [[x, y, z, w, v], …], bank, deco }]`, `lowland`, `life` | Fluss-Netz `level.river` (`RiverNet`) | **Reit-Level** (ganzes Level auf dem Floß): Archetyp `ride` |
| Rasterfluss | `path`, `width`, `speed`/`speeds`, `depth`, `banks`, `open` | Kollisionsformen (Wasser, Bett, Ufer) | Floß als **Gimmick** in einem Parcours (Entität `raft`, `speedwave`, Bausteinpark 0-2) |

Ein Reit-Level wie 1-4 nutzt den Archetyp `ride` (eigene Figur, Pflaumes Paddel-Pose, Reit-Kamera, Gabelungen, Klippe);
`raft`/`speedwave` bleiben für kurze Floß-Passagen in normalen Leveln. `riverrock` ist für beide gemeinsam (Kollisions-
zylinder + Netz-Felsen). Für die Kurvenform gibt es eigene Temposchwellen (`river_wave`) und Schanzen (`river_ramp`).

### Präzisierung (Ritt/Diorama): Archetyp `ride` – Daten

```js
archetype: 'ride', theme: 'river', music: 'course_river', killY: -60,
start: { pos: [0, 0.62, 12.5], yaw: Math.PI / 2 },          // zu Fuß auf dem Steg
ride: {
  raft: [0, 0, 5.4], raftYaw: -Math.PI / 2,                 // Pflaume wartet (schaut der Heldin entgegen)
  dock: { min: [x0, z0], max: [x1, z1] },                   // Neustart hier = zu Fuß, Floß wartet am Steg
  beach: { min, max, land: [x, y, z], raft?: [x, y, z] },   // Floß erreicht den Bereich → Heldin springt an Land
  footCamYaw: 0,                                            // Kamera-Gier zu Fuß (Grad als rad: 0 = Blick nach −Z)
},
segments: [{ type: 'river', channels: [...], lowland: { y, trees }, life: { butterflies, dragonflies } }, …],
checkpoint: [{ pos, yaw }],   // Fahne am Ufer: zählt beim Vorbeifahren (±2,2 m in z); Neustart 4 m flussauf im Kanal
```

- Kanalpunkte `[x, y, z, w, v]`: y = Wasseroberfläche, w = Breite, v = Strömung m/s. Kaskade = zwei Punkte im Abstand
  ~1,5 m mit Höhensprung; Klippe = Kanalende über einem tieferen Kanal (Lagune), der 0,6 m vor der Kante beginnt (in
  der Draufsicht überlappen, gleiche Breite an der Kante). Gabelung/Mündung: Kanal beginnt/endet auf der Mittellinie
  eines anderen; Ufer öffnen sich automatisch, die Strömung wird nach Lage im Kanal gemischt.
- Level-Hilfen: `new RiverChannel({ points })` liefert dieselbe Kurve wie im Spiel (`at(s)`, `nearest(x, z)`) – so
  liegen Wühler, Münzen, Sterne, Felsen relativ zur Kurve (`riverBankHeight(base, s, side)` für Dinge auf dem Ufer).
- Wühler im Fluss: normale Gegner-Daten (`ground: 'water'`, `path` quer zum Kanal). Der Archetyp blendet Wühler über
  27 m Entfernung aus und lässt 0,8 s vor dem Auftauchen Blasen aufsteigen.

### Präzisierung (Ritt/Diorama): RideController (Spielfigur-Schnittstelle wie Player)

| Wert | Größe |
| --- | --- |
| Strömung | trägt mit `v` des Kanals; Stick längs ±35 % (bremsen/beschleunigen), quer 5,6 m/s (× Tempo der Heldin) |
| Floß-Hüpfer | A: 1,6 m (Lotti ×1,08), gehalten höher; Schwerkraft 24 (gehalten) / 34 / Fallen 30 m/s² |
| Rampe `river_ramp` | fährt hinauf, am Ende Schwung + `kick` (6 m/s, mit gehaltenem A +2,6) |
| Welle `river_wave` | 1,15 s Schub `boost` m/s |
| Ufer/Felsen | Kreis r 0,62 m; Abprall (Ufer 0,45, Felsen 0,6), Gischt, Kippen der Darstellung |
| Klippe | ab 4 m Fall `plunging`: Schwerkraft 16, max. 18 m/s, Luftbremse → Landung mitten in der Lagune |
| Treffer | Power-up → keines, groß → klein, klein → Tod; Stoß zur Seite + Hopser, bleibt auf dem Floß |

Zusatzfelder für Darstellung/Tests: `riding, raftPos, raftYaw, raftMoored, dismounted, plunging, boostTime, bumpTime,
landImpact, flow (letzte Abfrage), camYaw` (Kamera-Gier aus der mittleren Fließrichtung der nächsten 26 m, in
Simulationsschritten geglättet → Steuerung deterministisch). `info()` ergänzt `riding, moored, dismounted, plunging,
boost, flow, channel`. Hülle auf dem Floß 1,24 × 1,44 × 1,24 m (Floß + Pflaume + Heldin) für Berührungen.

### Präzisierung (Ritt/Diorama): Archetyp `diorama` – Daten

```js
archetype: 'diorama', theme: 'diorama', music: 'course_diorama', killY: -14,
stars: [[x, y, z] × 5],       // der 5. gefundene Stern (alle fünf) beendet das Level
diorama: {
  center: [0, 2.5, 0],        // Drehpunkt der Orbit-Kamera
  camera: { yaw: 28, pitch: 46, dist: [36, 15], follow: [0.3, 0.9], fov: 40 },   // Überblick / nah (Z, ⊕)
  props: [{ kind: 'house'|'mushroom'|'banner'|'dig'|'cloudsea'|'islet', pos, … }],  // DioramaDeco.js
},
```

- Figur: `DioramaController` (Player ohne Sprung/Ducken/Rennen/Aktion, 3,5 m/s, Stufen ≤ 0,28 m und Rampen, fällt an
  Kanten, sanfter Rückstoß 2,2 m/s); Treffer-Puffer klein/groß wie gewohnt; Absturz unter `killY` → Neustart.
- Kamera: Q/E bzw. ⟲ ⟳ **gehalten** drehen stufenlos (100°/s), Wischen auf der rechten Bildhälfte (0,45°/Pixel quer,
  Neigung 24–70° senkrecht), Z/⊕ Zoom; Steuerung relativ zur Kamera. Test: `setInput({ cam: ±1 })`,
  `__course.arch.setOrbit(grad)`, `arch.orbit.info()`.
- Schatzstellen (`props` `dig`): stehen bleiben (oder Aktion) → Pflaume buddelt (`dig`) 3 Bitcoins aus.
- Sieg: alle Sterne → `player.startTreasure()` (Skript, `victory`, Kamera rückt heran) → nach 2,6 s
  `runtime.finish()`; das Ergebnis zeigt bei `LEVEL.diorama` „Schatz: alle 5 Sterne gefunden!“ statt der Zielmast-Zeile
  (`result.pole = null`).
- HUD und Ergebnis (gemeinsame Regel mit „Präzisierung (Arena/Boss)“): Stern-Plätze = `LEVEL.starSlots` ??
  max(3, Zahl der Sterne) (Diorama 5), Stempel-Platz nur mit `LEVEL.stamp`; das Stern-Panel im HUD passt seine Breite
  der Platzzahl an (Arena 1 Platz → schmales Panel).

### Präzisierung (Ritt/Diorama): Hinweise für Level-Bauer

- Treppen für Figuren ohne Sprung: Stufen ≤ 0,28 m (der Bodendruck der Figur von 2 m/s·dt zählt zur Stufenhöhe;
  0,2857 m bleibt hängen) – `stairs` mit `rise: 0.25`.
- Bewegte Plattformen im Diorama: Spalt zu den Haltestellen ≤ 0,15 m; die Plattform fährt nie durch begehbare Fläche.
- Budget: Archetyp `diorama` nimmt kleinen Entitäten (Käfer, Sterne, Truhen, Kobold) den Sonnenschatten (Blob bleibt),
  der Ritt Pflaume und der Heldin auf dem Floß sowie allen Wühlern. Gemessen: 1-4 57–109, 1-Schatz 48–114
  Zeichenaufrufe inkl. Schattenpass, höchstens 238 k Dreiecke.

---

## Präzisierung (Arena/Boss)

Ergänzung des Kampf-Level-Agenten (Stand: 1-A und 1-Burg). Nichts oben Festgelegtes wird geändert. Beide Archetypen
sind datengetrieben und für spätere Arenen/Bosse (2-A, 3-A …, weitere Endgegner) wiederverwendbar.

### Präzisierung (Arena/Boss): Dateien

```
src/course/archetypes/kinds/arena.js   Archetyp 'arena' (Gegner zählen, Stern nach dem Sieg, Neustart der Arena)
src/course/archetypes/kinds/boss.js    Archetyp 'boss' (Kampfbeginn, Sperre, Fahrt-Illusion, Kamera, Sieg → Warp-Box)
src/course/archetypes/hud.js           Zusatz-HUD (hängt sich an 'CourseUI'): Boss-Lebensleiste, Restgegner, Ansagen
src/course/entities/kinds/baron.js     Baron Brummbär im Sportwagen (Endgegner Welt 1)
src/course/entities/kinds/bomb_cannon.js  Bombenkanone (feuert Kickbomben mit Landeanzeige) + LandingMarkers, ballistic()
src/course/entities/kinds/fire_trail.js   Feuerspur (alle brennenden Flecken in einer Entität, 2 Zeichenaufrufe)
src/course/entities/kinds/rescue_friend.js  befreite Figur im Käfig (Krümel, Pflaumes Kaninchen-Freund) mit Sprechblase
src/course/blocks/types/highway.js     road, bossroad (Laufband), skyline, hwdeco (Schilder, Leitwände, Autos, Ampel …)
src/course/blocks/types/fortress.js    arena_cage, pennants, torches, crowd (Zuschauer jubeln auf Zuruf)
src/course/models/kinds/combat_w1.js   Modelle bomb_cannon, rescue_cage, boss_marker
src/course/view/theme_highway.js       Thema 'highway' (Abendhimmel, Fahrbahn-Farben), registriert in themes.js
src/course/levels/w1/1-A.js, 1-Burg.js
tests/course_w1_combat.mjs             Port 4197, Bilder tests/out/w1c_*.png
```

### Präzisierung (Arena/Boss): Archetyp `arena`

```js
arena: {
  enemies: 'all' | ['id', …],   // zählende Gegner (Standard: alle Gegner aus LEVEL.enemies)
  star: [x, y, z], starIndex: 0, // Stern erscheint hier nach dem letzten Sieg (steigt aus dem Boden, Kamerafahrt)
  reveal: 1.4,                   // s Pause nach dem letzten Sieg
  intro: 'Besiege …!',           // Ansage beim Start ('' = keine)
  crowd: 'crowd',                // Id der Tribünen (Baustein crowd) – jubeln bei Treffern/Sieg
  center: [x, y, z], camPull: 0.3, // Blickziel wird zur Mitte gezogen (Überblick)
},
starSlots: 1,                    // HUD/Ergebnis: Zahl der Stern-Plätze (ohne LEVEL.stamp kein Stempel-Platz)
```

Zählt über `level.onEnemyDefeated` (verkettet). Stern einsammeln → Siegespose (Skript `arena-win`), `runtime.finish()`
(Ergebnis „Arena: alle Gegner besiegt!“, Stern gespeichert, kein Zielmast). Tod → `runtime.respawn` ist umhüllt: alle
Arena-Gegner werden frisch aus ihren Daten erzeugt (volle Treffer), ein erschienener Stern verschwindet, Timer voll.
`info()`: `{ total, left, cleared, starShown, starTouch, won, resets, cut, hud }`.

### Präzisierung (Arena/Boss): Archetyp `boss`

```js
boss: {
  id: 'baron', name: 'Baron Brummbär',             // Endgegner-Entität (level.named) und Name der Lebensleiste
  trigger: { min: [x, y, z], max: [x, y, z] },     // Betreten startet den Kampf
  lock: { min, max },                              // Sperre hinter der Figur (Kollision, camIgnore) im Kampf
  speed: 10,                                       // Fahrtempo der Laufband-Illusion (level.highway.speed, m/s)
  frame: 0.5,                                      // Kampfkamera: Blickziel von der Figur zum Wagen (0..1)
  warp: 'warp_sieg',                               // versteckte Warp-Box (hidden: true) → reveal() nach dem Sieg
  warpPos: [x, y, z], warpTo: [x, y, z],           // Rückfall ohne Warp-Box: eigene Röhre
}
```

Schnittstelle der Boss-Entität (für weitere Endgegner): `begin()`, `reset()`, `state` (`wait` … `gone`), `stateT`,
`hp`, `maxHp`, `phase`, `visible`, `home`, `half`, `carHits`, `info()`; ruft `level.onBossHit(boss, where)` und
`level.onBossDefeated(boss)`. Der Archetyp startet bei `trigger`, setzt `lock`, fährt die Straße an, zeigt die
Lebensleiste, kehrt bei `state === 'gone'` zum Sieg (Warp-Box erscheint, Sperre weg). Tod im Kampf: Neustart am
Checkpoint vor der Arena, Kampf von vorn. Eigene Darstellung der Figur (`createRig`): steht sie auf der fahrenden
Straße mit Blick nach vorn, zeigt sie die Laufbewegung. `info()`: `{ started, won, speed, boss, hud, deaths, lock }`.

**Fahrende Straße (Entscheidung):** Laufband-Illusion. Figur und Endgegner bleiben im Kampffenster (≈ 14 × 16 m);
Markierungen, Fugen, Leitplankenpfosten, Laternen, Schilderbrücken, Überführungen, Pfeiler und die Stadt darunter
laufen mit `level.highway.speed` auf die Kamera zu (Baustein `bossroad`, Wiederholung 96 m, Shader-Clip an den
Straßenenden); die Stadtsilhouette zieht mit 35 % vorbei. Bomben bleiben im Fenster liegen (lesbar, kickbar); nur
die Feuerspur wandert mit der Straße auf die Figur zu.

### Präzisierung (Arena/Boss): Entitäten

```js
// Baron Brummbär: Wagen blickt zur Figur (+Z), fährt im Fenster quer (lane), wirft Kickbomben (Ausholen 0,5 s,
// Landering am Boden) in den Bereich arena. Treffer nur durch gekickte/geworfene Kickbomben (onBombHit): vordere
// Wagenhälfte = voller Treffer, Seite/Heck = Blechschaden (3 Blechschäden = 1 Treffer). Phasen nach Treffern:
// 1 Einzelwürfe (3,2 s), 2 schneller + jeder zweite ein Doppelwurf, 3 Schlangenlinie mit Feuerspur im Wechsel.
// Zielhilfe: grob auf ihn zurollende gekickte Bomben lenken leicht ein. Berührung verletzt (drauf springen: Abprall).
{ kind: 'baron', id: 'baron', pos: [x, y, z], lane: [-4.5, 4.5], arena: { x: [x0, x1], z: [z0, z1] }, hp: 3, drift: 6.5 }
// Bombenkanone: Ankündigung 0,8 s, Bombe im Bogen (Flugzeit flight), Landeanzeige; unzerstörbar.
{ kind: 'bomb_cannon', id, pos, yaw?, aim: 'player' | [x, y, z] | [[…], …], interval: 3.6, first: 1.2, range: 24,
  flight: 1.05, lead: 0.35, spread: 1.0, area?: { min: [x, z], max: [x, z] }, max: 2, fuse: 3.4, charge: 0.8 }
// Feuerspur: emit(x, y, z); Flecken brennen life s, wandern mit drift, verletzen bei Berührung (0,7 m hoch).
{ kind: 'fire_trail', drift: [0, 0, 6], life: 2.4, r: 0.42, zMax? }
// Befreite Figur: Käfig öffnet sich, wenn die Figur radius m nah ist; Hase hoppelt heraus, „Danke, Lotti!“.
{ kind: 'rescue_friend', id, pos, yaw?, name: 'Krümel', radius: 2.6 }
```

### Präzisierung (Arena/Boss): Bausteine (Kurzform; Parameter im Kopf der Dateien)

- `road { from, to, width: 12, lanes: 3, deck: 1.4, rails: 'both'|'left'|'right'|'none', lamps: 24, lampSide, pillars: 24,
  city: true, markings: true }` – Hochstraße mit Leitplanken (Kollision 0,95 m, camIgnore), Laternen, Pfeilern, Dächern.
- `bossroad { id, from, to, width: 14, lanes: 4, period: 96 }` – wie road, Zier läuft mit `level.highway.speed`.
- `skyline {}` – Stadtsilhouette am Horizont (folgt der Kamera, 2 Zeichenaufrufe).
- `hwdeco { items: [{ kind: gantry|sign|barrier|cone|cones|car|lamp|bridge|tlight|block, … }] }` – Schilder aus einem
  Textur-Atlas (`slot` 0 Burg Brummbär, 1 A 1, 2 Achtung Bomben!, 3 Baustelle, 4 Rastplatz, 5 Ausfahrt, 6 Tempo 30,
  7 Abendstadt), `bridge.solid` (Brückenplatte fest), `block` (unsichtbare Sperre), `tlight.mode` 'start'|'blink'.
- `arena_cage { pos, radius: 11, height: 5, floor, ceiling: 6.4, gate: π, low: 0.85 }` – im Bogen zur Kamera nur ein
  Geländer mit durchscheinendem Maschengitter (verdeckt die Figur nicht), Kollision ringsum gleich hoch.
- `crowd { id, stands: [{ from, to, rows, face }] }` → `level.named.get(id).cheer(stärke, dauer)`.
- `pennants { items: [{ pos, color, h }] }`, `torches { items, h }`.

### Präzisierung (Arena/Boss): Welt 1

| Level | Titel | Inhalt |
| --- | --- | --- |
| 1-A | Hörnerkrach im Käfig | Käfig Ø 22 m auf Festungsplattform, Tribünen, Wimpel, Fackeln; 2 Rammbock-Bullen; Stern in der Mitte; 200 s |
| 1-Burg | Brummbärs Abendautobahn | Startstraße (Ampel, Sternenring, Kickbomben, Turm, Mautmauer mit Pixel-Heldin), Kanonen-Zone, Baustelle (3 Stampfsteine, 2 bewegliche Plattformen), Turm-Hof (Krallenrad → Stern 2, graue Blockwand + Hof-Kanone → Stempel), Kurzer Weg (Checkpoint, Turm mit Stern 3), graue Steinwand mit Wand-Kanone → Warp-Box, Treppe 8 m, Bossstraße, Rastplatz mit Krümel und Zielmast; 500 s |

Abweichungen vom Bauplan: graue Blockwände durchgängig mit `megawall` (Steinwand quer über die Straße 8 × 4 m zwischen
Brückenwiderlagern, Überführung als Deckel); zwei zusätzliche Kanonen (Turm-Hof, Steinwand) liefern die Bomben
(„Nachschub endlos“); die Treppe hat niedrige Stufen (0,25 m, ohne Springen begehbar).
Gemessen (tests/course_w1_combat.mjs, scale 2): 1-A 60–90, 1-Burg 70–111 Zeichenaufrufe inkl. Schattenpass;
165–269 k Dreiecke.

## Welt 2 – Level-Liste und Freischaltung (Hauptsitzung)

Welt 2 „Wüste mit Sandblöcken“ wird nach Sieg über 1-Burg frei (Glasröhre am Ende der Welt-1-Insel; die
Welt-Warp-Röhre in 1-2 führt ebenfalls zur Welt-2-Insel). Sternbedarf zählt **alle** gesammelten Sterne.

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `2-1` | parcours (Wüstenschlucht, Treibsand) | desert | course_desert | 3 + Stempel | Welt 2 offen |
| `2-2` | parcours (Weltraum, Tastensteine) | space | course_space | 3 + Stempel | 2-1 **und ≥ 15 Sterne** |
| `2-3` | parcours (Schattenspiel, unterirdisch) | shadow | course_shadow | 3 + Stempel | 2-2 |
| `2-Haus` | house (Prüfungs-Haus, 5 Räume à 10 s) | house | course_house | 5 | 2-2 **und ≥ 20 Sterne** |
| `2-4` | parcours (Rollhügel + Untergrund) | grass | course_hills | 3 + Stempel | 2-3 |
| `2-A` | arena (Großrollpilze, Felsinsel im Lavasee) | lava | course_arena | 1 | 2-3 |
| `2-5` | parcours (Spiegelfrucht, rosa Grasland) | pinkgrass | course_cherry | 3 + Stempel | 2-4 |
| `2-Panzer` | autoscroller + boss (Panzerzug, Wirbelbrocken) | desert | course_tank | 3 + Stempel | 2-5 **und ≥ 30 Sterne** |

Welt 2 hat 24 Sterne. Neue Figuren-Rollen: wo der Bauplan den „Kapitän“ nennt (2-1, 2-3), tritt **Krümel**
(Pflaumes kleiner Kaninchen-Freund aus 1-Burg) auf. Der „Münz-Dieb“ heißt **Münzmarder** (flinker Marder mit
Münzsack). Mini-Pilzlinge: `pilzling` mit `mini: true` (halbe Größe, ein Treffer, kein Abprall-Bonus).

**Level-Notiz 2-1 „Rieselschlucht“** (`levels/w2/2-1.js`, Test `tests/course_w2a.mjs`): Wüstenschlucht über Tafelberg-
Plateaus, 400 s, ≈ 220 m, Checkpoint an der Oase. Sterne: 0 oben auf dem 6-m-Wachturm am Start (Krallen-Anzug aus dem
?-Block daneben), 1 im nordöstlichen von acht grauen Steinblöcken um einen eingeschlossenen Hackvogel (`track`: er
zerhackt den Block in Richtung der Figur – nicht besiegen), 2 Krümels Hackvogel beim Picknick besiegen (`task`).
Stempel: Sims über einer bröselnden Sandblock-Treppe vor der verschiebenden Fliesenbrücke. Extraleben: unsichtbarer
Block über dem Säulenstumpf der Oase. Goldröhre auf der Wand (Sprungfeld) → Raum mit goldenem Schalter (x ≈ 90, z ≈ 60).

**Level-Notiz 2-2 „Sternenklavier“** (`levels/w2/2-2.js`): Weltraum-Inseln, 400 s, ≈ 200 m, Checkpoint oben auf den
Kristallstufen. Sterne: 0 auf dem Kristall-Kamin (zwei Wandsprünge), 1 am Ende des Münzhimmels (Pendel-Propeller →
Wolkenkanone), 2 unter der dritten von drei Kristallplatten vor dem Ziel (Stampfen). Stempel: rechte Schwebeplattform
antippen (hebt sich) → Röhre darunter → Raum mit zwei Rollpilzen (x ≈ 80). Extraleben: Kristallblock auf dem
Checkpoint-Plateau oben stampfen → Truhe. Münzmarder auf dem Sternensteg links (einholen → Münzregen). Ziel über eine
Tastenstein-Treppe auf einer Klaviatur-Insel.
Level-lokaler Code beider Level (`LEVEL.setup`, Hilfen in `levels/w2/_helpers_a.js`): ferne Kulisse ohne
Sonnenschatten (`shadowless`), Gegner-Modelle > 40–50 m nicht zeichnen (`farHide`), Szenen-Figuren (Krümel, Dünen-
kamele, Steppenläufer, Fernrohr, Sternschnuppen, Asteroiden).

**Level-Notizen 2-3 / 2-4** (Level-Agent; Test `tests/course_w2b.mjs`, Port 4300, Bilder `tests/out/w2lv_*.png`):

- `2-3` **„Scherenschnittkeller“** – Schattentheater unter der Erde; die große Bühne (Leinwand 70 × 9 m) wird frontal
  gespielt (2D, Kamera-Vorschlag der Schattenwand). Sterne: 0 Schattenstern über den drei Bühnenkisten im Foyer (nur sein
  Schatten ist zu sehen), 1 Rätselbox hinter den Kulissen → Druckfeld → Schattentreppe zum unsichtbaren Stern,
  2 Lücke hinter dem Vorhang links vor der Ausgangstür: Holz-Silhouette des Barons umwerfen, Krümel schenkt den Stern.
  Stempel unter der Bühne hinter zwei Kisten (Falltür links der Riesenschnappblume). Extraleben im unsichtbaren Block
  über dem Bühnenpodest (sein Schatten verrät ihn). Checkpoint vor der Seitenbühne; Türen führen hinter die Kulissen.
- `2-4` **„Hügelmühle“** – Rollhügel mit Hügelwalzen und Windmühle, darunter das Räderwerk. Sterne: 0 Kletterfels
  zwischen den Glasröhren (Krallen-Anzug), 1 Farbfeld-Raum (Röhre unter einem Kristalldeckel – Stampfattacke), 2 zwischen
  den Riesenrädern fallen lassen. Stempel auf dem Turm am Start: Lotti- **und** Greta-Schalter lassen die Stufen erscheinen
  (Schild: Heldin über Pause → Figur wechseln). Extraleben: roter Ring auf dem Stufenhügel, unsichtbarer Block über der
  dritten Walze. Checkpoint mit Röhre in den Untergrund (Licht dort gedämpft).
- Level-lokale Szenen (Krümel, Vorhänge, Rampenlichter, Münzkäfig, Windmühle, Kaninchen, Schattensterne, Mühlenkeller-
  Dielen und -Pfosten, Untergrund-Licht) liegen in `src/course/levels/w2/_helpers_b.js`; Aufbau-Haken = brennende
  Laterne (`lantern` mit `lit: true`, `onLit: fn`).

**Level-Notizen 2-5 / 2-A / 2-Haus** (Level-Agent; gemeinsame Bausteine `src/course/levels/w2/_helpers_c.js` ohne
`LEVEL`; Test `tests/course_w2c.mjs [2-5|2-A|2-Haus]`, Port 4402 + PORT_BASE, Bilder `tests/out/w2c_*.png`):

- **Level-Haken:** alle drei nutzen `LEVEL.setup = levelSetup(fn)` (Präzisierung „Level-Haken“). `fn(level)` baut
  statische Zier (`addStatic`), Kollisionsformen, `level.onStep`-Funktionen und Hüllen (z. B. `runtime.respawn`, außen
  um die Hülle des Archetyps). Weil der Haken nach `view.finalize` läuft, verschmilzt `levelSetup` die neuen Teile
  (`view.static.build()`) und hängt sie an das vorhandene Mesh gleichen Materials/Schattenwurfs im selben 32-m-Abschnitt
  an (sonst + 1–2 Zeichenaufrufe je Abschnitt); danach `level.computeBounds()` (Absturzhöhe mit den eigenen Inseln).
  Der Himmel/Hintergrund wird mit dem Umriss **ohne** die Haken-Formen ausgelegt – wo das zählt, `killY` im Level setzen.
  Wunsch an den Motor: `addStatic` im Haken direkt in die Abschnitts-Meshes (oder ein `setup` vor `finalize`) – umgesetzt
  (Präzisierung „Leistung und Level-Haken 2“: spätes addStatic verschmilzt automatisch, `LEVEL.build`).
- **2-5 „Doppelgängersteig“** (parcours, pinkgrass, course_cherry, 400 s, ≈ 235 m nach −Z): Blütenweg (Spiegelfrucht
  mit Schild) → Kistenhof (Stern 1 versteckt in der hinteren rechten Kiste, Stampfattacke) → Rosenhecken-Gang mit
  zwei Marschblock-Kolonnen, Nischen-Druckfeld (2 Figuren → 1-Up + Münzen), Druckfeld für 2 senkt das Tor (übersprungen:
  öffnet sich von hinten) → Glasrohr-Platz → Blockgarten (Checkpoint; Stempel auf dem Turm links hinten über den
  wachsenden ?-Block oder Krallen an der Kletterwand; versteckter 1-Up-Block über dem gelben Block) → Marschblock-Hügel
  (Spiegelfrucht im Kreis einer Kolonne, roter Ring, ?-Block und versteckter Block mit Spiegelfrucht,
  Zwillingsfelder unter dem Rosenbogen → Stern 2, Heldin + Klon gleichzeitig) → Feuer-Werfer-Gasse
  (Einweg-Bühne; besiegt → Treppe zum Felsturm, Röhre) → Zielhügel (drei Spiegelfrüchte + Strauch; Viererlift mit
  vier Figuren → Stern 3 auf dem Turm; Zielmast). Spiegelfrucht-Nachschub vor jedem Rätsel (Sträucher wachsen nach).
- **2-A „Glutsee-Rempelei“** (arena, lava, course_arena, 1 Stern, 200 s): organische Felsinsel (r ≈ 10,6 m) im
  Lavasee, Kraterwand, Vulkane, Glutfunken. Welle 1: ein Großrollpilz; Welle 2: zwei fallen vom Himmel
  (`arenaWaves`: spätere Wellen ruhen geparkt über der Insel). Umwerfen (Draufspringen) und in die Lava stoßen;
  Stern danach in der Inselmitte. Tod setzt Arena und Wellen zurück.
- **2-Haus „Villa Tick-Tack“** (house, course_house, 5 Sterne, je Raum 10 s): Kinderzimmer (2 Rollpilze besiegen),
  Bibliothek (2 Panzerkröten), Küche (8 Münzen sammeln, drei auf dem Tisch; zwei Krallen-Pilzlinge), Uhrenstube (Stern
  auf dem Podest erreichen, vier Hackvögel im Takt), Kaminzimmer (2 Feuer-Werfer, einer auf der Einweg-Galerie).
  Jeder Raum mit eigener Tapete, eigenem Boden, Teppich, Möbeln, Bildern (u. a. Baron-Brummbär-Steckbrief) und
  tickenden Uhren (Minutenzeiger 1 Umdrehung je 10 s).
- **Kennzahlen** (scale 2, inkl. Schattenpass): 2-5 mit einer Figur ≤ 92 Aufrufe / ≤ 263 k Dreiecke, mit vier Figuren
  115 / 193 k, mit fünf 144 / 286 k (jede weitere Figur kostet ≈ 12–16 Aufrufe; ?-Blöcke ≈ 3 k Dreiecke je Stück und
  Pass, Münzen ≈ 0,4 k – beides wird immer gezeichnet); 2-A ≤ 76 / ≤ 82 k; 2-Haus ≤ 72 / ≤ 121 k.

**Level-Notiz 2-Panzer „Brummbärs Panzerparade“** (`levels/w2/2-Panzer.js`, Hilfen `levels/w2/_helpers_d.js`, Test
`tests/course_w2d.mjs`): 14 Panzer (`panzer_fahrzeug`) fahren mit 3 m/s durchs Treibsandmeer (Baustein `quicksand`,
Oberfläche 0,3 m: wer fällt, versinkt), das Bildfenster gleitet mit 5,2 m/s am Zug entlang (Konvoi-Rechnung mit
`ScrollWindow` beim Laden: Fenster und Panzer halten gemeinsam über dem Kommandopanzer). Abendrot als lokale Variante
des Themas `desert` (Himmel, Licht, Nebel, Gelände-Farben, Tafelberg-Kulisse; das gemeinsame Thema bleibt
unverändert). Zwei Haken, keine Änderung gemeinsamer Dateien: beim Aufbau die erste Laterne (`lantern`, `lit: true`,
Aktion `onLit` = Funktion) – nur Abendrot und der in die statische Geometrie gebackene Festungspanzer unter der Arena,
beides muss vor dem Verschmelzen geschehen; alles Übrige im offiziellen `LEVEL.setup` (Präzisierung „Level-Haken“,
je Schritt `level.onStep`): Panzerluke (öffnet beim Halt → Bossarena), Holzwand mit Baron-Gesicht (Modell
`holzwand_boss`, drei Kanonenkugeln), Metalltor (Modell `metalltor`, Kanonenkugel öffnet), Baron-Wimpel und
Staubfahnen an den Panzern, Fluchtszene des Barons im Sportwagen mit Kameraschwenk. **Mitfahr-Regeln** (für spätere
Panzer-/Zug-Level wiederverwendbar): Marschblock-Kolonnen mit `ride: '<Panzer>'` marschieren auf dem fahrenden Deck;
ein `roter_ring` mit `attach` lässt seine roten Münzen auf den Panzern erscheinen und mitfahren; neu entstandene Dinge
über einem Deck (Power-up aus ?-Block, Stern aus Kiste, abgeworfener Helm, 1-up) fahren mit; Kanonen-Helme liegen an
Stellen auf Panzern bereit (`panzer.helmets`, nachgelegt nach `every` s bzw. nach einem Neustart). Kombination
`autoscroller` + `with: 'boss'`: der Level-Haken reicht `boss`/`seenPhase` des Zusatz-Archetyps durch (Ansage
Wirbelbrocken Phase 3) und verhindert die „Feuerspur“-Ansage des Barons beim Phasenwechsel. Budget-Kniffe (level-lokal):
statische 32-m-Abschnitte werden je Bild per Quader gegen Sichtpyramide und Nebelweite geprüft (die Begrenzungskugel
von Festung + Oase, ≈ 60 k Dreiecke, schneidet die flache Sicht sonst immer), während der Fahrt wirft die Kulisse keinen
Sonnenschatten. Gemessen (scale 2, `tests/course_w2d.mjs`, 33 Prüfungen): 66–127 Zeichenaufrufe inkl. Schattenpass,
149–265 k Dreiecke; Fahrt bis zum Zughalt ≈ 81 s, Ziel nach ≈ 124 s (Bot).

## Präzisierung (Mehrwelten-Karte)

Ergänzung des Weltkarten-Agenten (Stand: Welt 2). Nichts oben Festgelegtes wird geändert; die Karte zeigt jetzt eine
Welt je Insel, gewechselt wird nur über Glasröhren (kein Menü).

### Präzisierung (Mehrwelten-Karte): Dateien

```
src/course/map/
  worlds/w2.js   Welt 2 „Wüste mit Sandblöcken“ (reine Daten)
  travel.js      Glasröhren-Fahrt (Abfahrt/Ankunft) über player.ride + Verfolger-Kamera (rig.custom)
  warp.js        Welt-Warp aus einem Level (Röhre mit warpWorld) – CourseScene ruft installWorldWarps(scene)
  desert.js      Wüsten-Geländestile (gestapelte Sandstein-Schichten, Dünen, rosa Gras, Lavafels), sparsame Requisiten
  decor_w2.js    Kulissen der Welt-2-Eingänge (Schluchttor, Sternenplattform, Höhle mit Lichtschein, Haus, Hügelwalze,
                 Lava-Felsinsel mit Steinbrücke, Doppelkirsche, Panzer-Depot mit Baron-Flagge)
  slot.js        Glückshaus mit Spielautomat (Logik + Darstellung)
  bake.js        Modelle der Registry (Palme, Kaktus, Säulenruine, Pyramide, Blütenbaum, Panzerwagen, Sandblock …) als
                 statische Kulisse in die Karten-Kacheln einbacken (gleiche Optik wie im Level, keine Zeichenaufrufe je Stück)
  lod.js         Fern-Ausblendung kleiner Kartenobjekte (Eingänge, Schranken, Gegnergruppe, Schilder) jenseits von 90 m
                 vor der Kamera – über Ebenen (layers), auch im Schattenpass; greift nur beim Anflug und bei der Ankunft.
                 pauseShadows(view): Schattenkarte einmal zeichnen, dann ruhen lassen (gezählt, gemeinsamer Renderer)
```

### Präzisierung (Mehrwelten-Karte): Weltdaten (zusätzlich zum Format oben, alles optional)

```js
export const MAP = {
  …, short: 'Wüste',                    // Kurzname (Weltschild im HUD, Schild an der Glasröhre)
  theme: 'map_desert', kit: 'desert',   // Thema (scenery.js meldet 'map_desert' an) und Geländestil-Satz
  music: 'course_world2_map', fallbackMusic: 'course_map',   // fehlt das Thema noch, spielt fallbackMusic
  starScope: 'all',                     // minStars zählt alle gesammelten Sterne (Standard: Sterne dieser Welt)
  edges: { hedge: 'adobe', fence: 'rope' },                  // Randdeko: 'hedge'|'adobe'|'pink' bzw. 'fence'|'rope'|'chain'
  pathColors: [hell, mittel, Kante], // Wegplatten
  neighbors: [{ world: 1, pos: [x, z], size: [w, d], style: 'grass'|'desert' }],  // Nachbarwelt am Horizont
  levels: [
    { id: 'W1', world: 1, next: 1, label: 'Welt 1', stars: 0 },                     // Glasröhre zurück (immer offen)
    { id: 'W3', after: '2-Panzer', world: 3, next: 3, label: 'Welt 3', stars: 0 },  // ohne Karte von Welt 3: „Bald“
  ],
  ground: [{ rect, top, style?: 'desert'|'sandstone'|'dune'|'pink'|'grass'|'lavarock'|'basin'|'pond'|'sand', mound?,
             edge?, fence?, walk?, noDeco?, noEdge? }],
  entrances: [{ id, kind: 'canyon'|'space'|'glowcave'|'mystery'|'hills'|'lavaarena'|'pinkgrass'|'tankdepot'|'pipe'|…,
                pos, decor?, exit?, steps? (space), spikes?/braziers?/bridge? (lavaarena), pipe?, signPos?, signYaw? }],
  roamers: [{ level, model, fallback?, fallbackScale?, count, circle: [x, z, r] | from/to, y?, speed, half?, hint? }],
  houses: [{ kind: 'beeren', … }, { kind: 'glueck', pos, yaw, machine: [x, y, z], pad: [x, y, z], stake: 10 }],
  props: [{ kind: 'palm'|'cactus'|'column'|'arch'|'pyramid'|'pinktree'|'tank'|'sandblocks'|'sandstack'|'obelisk'|
            'sphinx'|'pots'|'tent'|'well'|'stall'|'planter'|'tufts'|'shells'|'crates'|'sandbags'|'rock'|'shrub'|…,
            pos, yaw?, size?, model?: false }],   // begehbarer Fuß → Kollision; Registry-Modell, sonst eigene Geometrie
};
```

Regeln für Welt 2+: Glasröhren-Eingänge (`next: n`) sind startbar, wenn ihr Weg frei ist und es `worlds/w<n>.js` gibt
(Titel = Name der Zielwelt), sonst „Bald“. Ihr Weg ist zusätzlich frei, sobald Welt n schon offen ist. Gelände südlich
(zur Kamera hin) begehbarer Flächen bleibt niedrig (Faustregel: Höhe über dem Weg < 1,2 × Abstand), sonst rückt die
Kamera an die Figur heran.

### Präzisierung (Mehrwelten-Karte): Freischaltung und Speicherstand (additiv)

- `unlock.worldOpen(getWorldMap, save, n)`: Welt 1 immer; sonst `save.worldOpened(n)` oder die Glasröhre der Welt n−1
  ist frei. `unlock.gateStars(map, save)` = Sterne für minStars (`starScope`). Welt 2 ist frei nach `1-Burg`.
- `courseSave`: `world` (aktuelle Welt, get/set; nach Neuladen wieder gezeigt), `worlds` (offene Welten),
  `worldOpened(n)`, `openWorld(n)`, `spendCoins(n)` → false ohne genug Bitcoins, `slotSpins`/`nextSlotSpin()`.
- `CourseMap` wählt die Welt: `{ warpWorld }` → `{ world }` → Welt des Levels aus `from` → `courseSave.world`; ist sie
  nicht offen oder ohne Karte, Welt 1.

### Präzisierung (Mehrwelten-Karte): Übergänge

- **Glasröhre** (Eingang mit `next`): A/Enter/„Los!“ auf dem Podest → Hüpfer in den Röhrenfuß, Fahrt die Röhre hinauf
  und übers Meer (3,4 s, Verfolger-Kamera, Toast „Auf zu Welt n!“), weiße Blende → `scene.start('CourseMap', { world: n,
  via: 'tube', fromWorld })`. In Welt n startet die Figur weit draußen in der Rückweg-Röhre (Regel `next: fromWorld`),
  saust zum Röhrenfuß (3,2 s) und hüpft vor das Podest; danach Kamera-Überblendung, frisch geöffnete Schranken werden
  erst dann gezeigt. Alles im Simulationstakt (`step(n)`), `state().travel = { mode, phase, t, entrance, shadows }`.
  In der ersten Sekunde der Ankunft (Röhre weit draußen, Blick über die ganze Insel) ruht die Schattenkarte
  (`pauseShadows`, beim Ende/`dispose` zurück); ebenso beim Anflug: einmal bei der stehenden Heldin gezeichnet (dort
  endet der Flug), dann bis `endIntro()`. `snapCamera()` rastet während der Fahrt die Verfolger-Kamera ein.
- **Welt-Warp aus einem Level**: Röhre `{ type: 'pipe', id, target, warpWorld: n }` funktioniert wie eine Warp-Röhre;
  beim Teleport schaltet sie Welt n frei (`openWorld`) und beendet das Level ohne Zielmast (weiße Blende →
  `exitToMap({ warpWorld: n })` → Ankunft wie mit der Glasröhre). Im Testtakt (`setManual`) bleibt die Szene stehen und
  meldet `state().worldWarp`. 1-2: `p_world2` (Krallen-Sims) → Welt 2 (im Vorbild schaltet sie die Welt frei).
- **Schranken von hinten**: Kommt die Figur von der gesperrten Seite (z. B. nach dem Warp zurück in Welt 1 hinter
  gesperrten Wegen), sinken die Blöcke kurz ab und heben sich wieder, sobald sie hindurch ist (`layout.gateSides`,
  `MapGate.updatePass`); von vorn bleiben sie zu.

### Präzisierung (Mehrwelten-Karte): Kartenelemente Welt 2

- **Glückshaus**: Matte vor dem Spielautomaten, A zieht den Hebel; Einsatz 10 Bitcoins (sonst Hinweis, kein Spiel);
  drei Walzen (Bitcoin, Herz, Funkenblüte, Krallen-Anzug, Funkelstern, Baron), halten nacheinander. 3 × Bitcoin
  30 Bitcoins, 3 × Herz 1 Leben + 10 Bitcoins, 3 × Power-up → Power-up fürs nächste Level (wie Beerenhaus), 2 gleiche
  Einsatz zurück. Ergebnis aus der Nummer der Drehung (deterministisch), Tests: `__courseMap.slot.force([…])`.
- **Beerenhaus** in der Nische östlich des Strands (Funkenblüte/Krallen-Anzug im Wechsel).
- **Gegnergruppe 2-A**: drei Großrollpilze laufen im Kreis über die Lava-Felsinsel (Modell `grossrollpilz`).
- HUD: dauerhaftes Weltschild „Welt n · Kurzname“ mit allen gesammelten Sternen; Hinweis an Sternschranken
  „Benötigt N Sterne (x/N)“ mit den zählenden Sternen.
- Test: `tests/course_map_w2.mjs` (Port 4210, Screenshots `tests/out/cmap2_*.png`).

Gemessen (scale 2, `tests/course_map_w2.mjs`): Kartenansichten Welt 2 71–105 Zeichenaufrufe inkl. Schattenpass,
169–286 k Dreiecke; Ankunft durch die Glasröhre 85–100 / 225–230 k, Anflug 99 / 272 k (Budget 120 / 300 k).
Statische Kulisse Welt 2: 51 Kachel-Meshes, ≈ 207 k Dreiecke. Welt 1 unverändert im Budget (85 / 245 k).

### Präzisierung (Mehrwelten-Karte): Welt 3 „Schnee und Eis“ (Notiz)

- Dateien: `worlds/w3.js` (Daten), `snow.js` (Geländestile, Ränder, Streudeko, Winter-Requisiten, Thema `map_snow`),
  `decor_w3.js` (Kulissen der Welt-3-Eingänge). Weltdaten zusätzlich: `kit: 'snow'`, `seaColors: [flach, mittel, tief]`,
  `snowfall: { count }` (Schneeflocken um den Blickpunkt, ein Punkte-Objekt). Geländestile `snow`|`snowhill`|`forest`|
  `cliff` (Eiszapfen vorn)|`peak`|`ice` (mit `ice: true` rutschig wie im Level)|`lakebed` (Seegrund, das Meer ist der
  See)|`snowbeach`|`pastel`|`autumn`|`paving`|`asphalt` (`grid` = Startfelder)|`spook`; Ränder `edges.hedge`
  `'snow'|'mint'|'autumn'`, `fence: 'snowfence'`; Bausteine `snowstairs` (sparsame Stufen) und `snowbridge` (Holzbrücke
  mit Schnee, Kollision wie `bridge`, ≈ 15 % der Dreiecke), beide nur Karte. Neue Requisiten u. a. `stall`, `fountain`,
  `tomb`, `spookfence`, `snowangel`, `footprints`, `rowboat`, `skates`, `curling`, `bigfir`, `igloo_lo`, `snowman_lo`.
- Kacheln je Karte: `batch: { tile, origin: [x, z], freeTile, freeOrigin }` (MapBatcher; ohne Angabe wie bisher 32 m ab 0).
  Welt 3: 32 m ab (16, 16), Teile ohne Schattenwurf (Schneedecken, Wege, Ränder) in 64-m-Kacheln – sie fehlen im
  Schattenpass, große Kacheln sparen Zeichenaufrufe im Weitblick. `addStatic(g, { tile: 'name' })` legt Teile in eine
  benannte Kachel (Welt 3: Eisschollen und Inselchen je 96-m-Meeressektor, ohne Schattenwurf).
- Eingänge: `kind` `snowfield`|`skyladder`|`spookhouse`|`kapitaen`|`pavilion`|`redfortress` (`cage`, `podests`)|
  `lagoon` (`wreck`, `buoy`)|`racehill` (`road` = begehbare Rennrampe, `barriers`, `tires`, `flags`)|`circustent`
  (`ropeway` mit fahrender Gondel, `bunting`, `booth`)|`autumnfalls` (`waterfall`, `pool`, `rail` mit fahrender
  Schalttafel)|`station` (`train`, `canopy`, `lamps`, `benches`). `appear: true` (3-Kapitän): Eingang samt Kulisse
  verborgen, bis sein Weg frei ist; beim Schranken-Schwenk taucht er aus dem See auf (`state().entrances[id].hidden`;
  am Ende der Kamerapause `settleReveal()`, damit die Endlage auch bei wenigen gezeichneten Bildern stimmt).
  `disc`: kürzere Aufschrift der Nummernscheibe. Gegnergruppe: `anims` (Modell ohne Laufanimation, z. B.
  `{ walk: 'idle', idle: 'cast' }`), `castShadow: false` (nur Schatten-Blob).
- Glasröhre nach Welt 4 frei nach dem Weltboss `3-B` (Bauplan: Röhre nach dem Weltboss), ohne Karte „Bald“. Die
  Welt-2-Röhre `W3` fährt jetzt übers Meer nach Nordosten zur Schneeinsel am Horizont (`neighbors` Stil `'snow'`).
  `pipeDetail: 'low'` (Eingangsart `pipe`): lange Röhre mit 12 statt 16 Seiten, weniger Abschnitten und seltener
  Ringen draußen – Welt-2-Röhre `W3` sowie beide Welt-3-Röhren (die Welt-2-Ansichten bleiben so beim alten Stand).
- Sterne: Die Welt-3-Tabelle ergibt 31 Sterne (8 × 3 + 5 + 1 + 1); der Satz „Welt 3 hat 32 Sterne“ unter der Tabelle
  („Welt 3 – Level-Liste“) passt nicht dazu – die Karte zählt nach der Tabelle. Vor den Sternschranken stehen Schilder
  „ab 35 ★“, „ab 45 ★“, „ab 55 ★“.
- Test: `tests/course_map_w3.mjs` (Port 4230, Bilder `tests/out/cmap3_*.png`); auf langsamen Rechnern in drei
  Teilläufen `W3_TEIL=1|2|3` (Abschnitte 2–4, 5–9, 10–14, je mit den Node-Prüfungen).

Gemessen (scale 2, `tests/course_map_w3.mjs`): Kartenansichten Welt 3 67–97 Zeichenaufrufe inkl. Schattenpass,
139–266 k Dreiecke; Ankunft durch die Glasröhre 81–105 / 201–235 k, Anflug 108 / 262 k (Budget 120 / 300 k).
Statische Kulisse Welt 3: 51 Kachel-Meshes, ≈ 191 k Dreiecke, 406 Kollisionsformen. Welt 2 unverändert im Budget
(max 105 / 286 k), Welt 1 ebenso (86 / 245 k).

### Präzisierung (Mehrwelten-Karte): Welt 4 „Canyon-Inselkette“ (Notiz)

- Dateien: `worlds/w4.js` (Daten), `canyon.js` (Thema `map_canyon`, Geländestile, Ränder, Streudeko, Requisiten,
  Hängebrücke/Felsbogen, Inselchen und Nachbarwelt `'canyon'`), `decor_w4.js` (Kulissen der Welt-4-Eingänge,
  Piep-Takt, Seilbahn, Ersatzmodelle der Gegnergruppen). Inseln: A Ankunft (Ameisenhügel 4-1, Beerenhaus-Nische),
  B Giftwald (4-2, Giftsumpf, Glückshaus), C Lava-Felsinsel im Lavasee (4-A), D Technik-Insel (Lautsprecherturm 4-3),
  E Haus-Insel (Uhrenhaus 4-Haus, Seilbahn zur Ruinenstadt), F Bergwiese (4-4), G Ruinenstadt (4-5), H Werfer-Festung
  (4-B), I Lava-Burg (4-Burg, Lavagraben mit Lavafällen), J Röhren-Insel (Welt 5); verbunden über Hängebrücken und
  Felsbögen, Sternschranken mit Schildern „ab 60/70/80 ★“ vor 4-3, 4-Haus und 4-Burg.
- Weltdaten zusätzlich: `kit: 'canyon'`; Geländestile `canyon`|`canyonlow`|`mesa` (rote Schichten, Tafelberg-Decke)|
  `beach`|`meadow`|`poison` (violette Erde, Moos)|`marsh`|`swamp` (Becken unter dem Giftwasser-Modell)|`tech`
  (Metallplatten, Warnstreifen)|`ruins`|`castle` (Basalt mit Glutrissen)|`fortress`, dazu `lavarock`/`basin` aus
  `desert.js`; Ränder `edges: { hedge: 'redrock', fence: 'rope' }`. Bausteine (nur Karte, Kollision wie `bridge`):
  `segments: [{ type: 'ropebridge'|'rockarch', from, to, width }]`. Kulisse `cableways: [{ from, to, hFrom, hTo, sag }]`
  (Masten, Seil, pendelnde Gondel `seilbahn_gondel`). Kacheln `batch: { tile: 40, origin: [8, 8], freeTile: 80,
  freeOrigin: [-16, -16] }`.
- Eingänge: `kind` `anthill` (Ameisenhügel mit Ameisensoldaten als Instanzen)|`poisonwood` (`waterfall`, `swamp`,
  `trees`, `shrooms`)|`lavaisle` (`spikes`, `braziers`)|`beeptower`|`mysteryclock`|`bouncemeadow` (`trampolines:
  [[x, z, scale]]` federn die Figur hoch, `windmill`, `clouds`)|`ruincity` (`gates`)|`bluefortress` (`cage`)|
  `lavacastle` (`lavafalls`); Röhren mit `arriveCam: { up, ahead, drop }` (travel.js: Verfolger-Kamera bei der Ankunft
  steiler/näher als Standard 3,4/12/0,6 – weniger Weitblick, weniger Zeichenaufrufe; auch die Welt-3-Röhre `W4`).
  Registry-Modelle der Welt 4 werden eingebacken (`bake.js`: `felsnadel`, `canyon_bogen`, `tafelberg`, `wolkeninsel`)
  oder leben (Lautsprecher, Riesentrampolin, Giftwasser, Lavafall, Banner …); fehlt eines, zeichnet `decor_w4.js` eigene
  Geometrie.
- **Piep-Blöcke** am Lautsprecherturm: Satz a/b wechselt alle 4 Zählzeiten der Taktuhr `music.beat()` der Kartenmusik
  (`course_world4_map`, 122 BPM), in der letzten Zählzeit blinkt der nächste Satz; ohne laufende Musik zählt eine eigene
  Uhr (122 BPM, Kartenzeit). `state().beep = { active, beat, warn, source, theme, shown }`. Tests stellen die Uhr mit
  `__audio.music.setManualClock(true)` / `advanceClock(s)`.
- Gegnergruppen: `standIn` (Ersatzmodell aus `STAND_INS`, solange das Registry-Modell fehlt) und `instance: true`
  (`entities.instanceRoamers`: Teile mit gleicher Geometrie und gleichem Material aller Mitglieder als ein
  InstancedMesh, Ausblendung je Figur über Sichtkegel/Entfernung). 4-A: drei `lavabrocken`, 4-B: drei `feuer_werfer`.
- Übergang Welt 3 → 4: Die Röhre `W4` in Welt 3 ist frei nach **`3-Zug`** (ersetzt „nach 3-B“ in der Welt-3-Notiz,
  passend zur Welt-4-Tabelle) und fährt übers Meer nach Nordosten zu den Canyon-Inseln am Horizont (`neighbors` Stil
  `'canyon'`, `[64, -224]`). Ankunft in Welt 4 an der Rückweg-Röhre `W3` im Südwesten der Ankunftsinsel.
- **Welt-Warp in eine Welt ohne Karte** (4-2 → Welt 5): `exitToMap({ warpWorld: n })` ohne `worlds/w<n>.js` →
  `CourseMap.chooseWorld`: `courseSave.openWorld(n)` (Welt n gilt als entdeckt), dann `warpFallbackWorld(n, from)` =
  erste offene Welt mit einer Glasröhre `next: n` (Welt des Levels, gemerkte Kartenwelt, n−1). Die Figur kommt dort
  durch diese Röhre an (wie `via: 'tube'`, `fromWorld: n`), danach Meldung „Welt n kommt bald!“, `state().soonWorld = n`;
  der Weg zur Röhre ist frei (`worldOpened(n)`), `state().entrances[id].discovered = true`, A/Enter auf dem Podest zeigt
  wieder die Meldung statt einer Fahrt. **Welt 5 nachrüsten:** nur `worlds/w5.js` mit `MAP.world = 5` anlegen (Registry
  sammelt `w*.js`) samt Rückweg-Röhre `{ id: 'W4', world: 4, next: 4 }`; dann führen derselbe Warp und die Röhre `W5`
  ohne Codeänderung nach Welt 5.
- Test: `tests/course_map_w4.mjs` (Port 4240, Bilder `tests/out/cmap4_*.png`), Teilläufe `W4_TEIL=1|2|3` (Abschnitte
  2–4, 5–9, 10–14, je mit den Node-Prüfungen). `tests/course_map_w2.mjs` hat jetzt ebenfalls `W2_TEIL=1|2|3`.

Gemessen (scale 2, `tests/course_map_w4.mjs`): Kartenansichten Welt 4 70–97 Zeichenaufrufe inkl. Schattenpass,
168–261 k Dreiecke; Ankunft durch die Glasröhre 79–101 / 214–231 k, Anflug 97 / 256 k (Budget 120 / 300 k).
Welt 3 an der Röhre nach Welt 4 und bei der Ankunft von Welt 4 höchstens 91 / 245 k. Statische Kulisse Welt 4:
43 Kachel-Meshes, ≈ 156 k Dreiecke, ≈ 245 Kollisionsformen.

### Präzisierung (Mehrwelten-Karte): Welt 5 „Lila Strand-Insel“ (Notiz)

- Dateien: `worlds/w5.js` (Daten, `MAP.world = 5`, Musik `course_world5_map`), `beach5.js` (Thema `map_lila`, Geländestile,
  Ränder, Streudeko, Requisiten, Holzstege, Inselchen und Nachbarwelt-Stil `'lila'`), `decor_w5.js` (Kulissen der
  Welt-5-Eingänge). Additiv angebunden in `MapBuilder.js` (`map.kit === 'lila'`), `scenery.js`, `entrances.js`
  (`decorateW5`), `props.js` (Podestfarben), `CourseMapScene.js` (`state().decor`, s. u.); `worlds/w4.js` zeigt die
  Lila-Insel als Nachbarwelt am Ende ihrer Welt-5-Röhre (`neighbors` Stil `'lila'`, `[312, −210]`).
- Inseln (begehbar, Höhe) und Eingänge (`kind`): A Ankunftsbucht y 1 mit Beerenhaus-Nische – `W4` Glasröhre zurück
  (−16, 1, 42), `5-1` `seaside` Sonnenstrand (18.5, 1, 36; Strandkörbe, Schirme, Warp-Box mit fünf Schlüsselmünzen,
  Wellen `waves`); B Zirkus-Insel y 2 – `5-2` `bigtop` Zirkuszelt (−4, 2, −4; Wimpel, Trapez-Gerüst `trapeze`); BA Arena-Insel
  y 1.6 – `5-A` `bullcage` Arena-Käfig (−38, 1.6, −5; `cage`, `towers`, Hörnertor `gateAt`, Gegnergruppe 5 ×
  `rammbock_bulle`); BH Höhlen-Insel y 2 – `5-3` `bluecave` Höhleneingang mit blauem Lavaschein (35, 2, −6, „ab 90 ★“);
  C Savanne y 3.5 mit Savannenberg (Block `savannahill` mit `hill`, Grasrand `edge: 'tufts'`) – `5-4` `savanna`
  (−9, 3.5, −59.5; Röhrenkanone `cannon`, `acacias`, `termites`, hüpfende Hasen `bunnies`, einer leuchtet grün);
  CG Spuk-Insel y 3.5 – `5-Kapitän` `ghostdiorama` Geisterhaus-Diorama (−50, 3.5, −45; Kreisgeister-Ring, Großspuk,
  Krümel `kruemel`, Scheibe „5-K“); D Minen-Insel y 4.5 – `5-5` `mine` (30, 4.5, −59.5; Loren auf `rail`, Zündkopf-Haufen,
  POW-Block, lila Ziegelwand), Schlucht nach Norden; DL Lava-Felsen y 2 im Lavasee – `5-B` `lavarocks` (76, 2, −52;
  steigende Steinsäulen `pillars`, Werfer-Thron `tower`, Feuerschalen `braziers`, Gegnergruppe 3 × `feuer_werfer`);
  E Torten-Insel y 5.5 – `5-6` `cakeisle` Riesentorte (46, 5.5, −102; Kerzen, Rot-Blau-Flipper `flipper`);
  F Schleich-Festung y 6 – `5-7` `sneakfort` (−4, 6, −112.5; Suchscheinwerfer `lamp`, Kreis des Lichtflecks `sweep`);
  G Goldzug-Bahnhof y 6 mit Glückshaus – `5-Zug` `goldstation` (−46, 6, −109; Gleis und Goldzug `rail`); H Ruinen-Tempel
  y 7 – `5-Burg` `kipptemple` Stufenpyramide mit Kippquader-König (10, 7, −149, „ab 100 ★“); I Röhren-Insel y 7 – `W6`
  Glasröhre (54, 7, −158), steigt nach Nordosten zu fernen Wolkeninseln. Verbunden über zwölf Holzstege
  (`segments: [{ type: 'boardwalk', from, to, width }]`, Kollision wie `bridge`); zwölf Schranken je 4 m auf Stegen bzw. in
  der Schlucht.
- Weltdaten zusätzlich: `kit: 'lila'`, `birdStyle: 'gull'` (Möwen), Geländestile `lila` (Standard, begehbarer Flieder-Sand)|
  `lilarock`|`lilabeach`|`palmgrove`|`circus`|`arena`|`cave` (blau glühende Risse)|`savanna`|`savannahill` (`hill: { h,
  at, r }`)|`spook`|`gravel`|`cake` (Biskuit-/Sahneschichten, Zuckerguss-Tropfen, Streusel)|`fort` (Glutfugen)|`paving`|
  `temple`, dazu `lavarock`/`basin` aus `desert.js`; Ränder `edges: { hedge: 'violetrock', fence: 'rope' }`, je Block
  `edge`/`fence` `'driftwood'`|`'tropic'`|`'cream'`|`'fortwall'`|`'templewall'`|`'tufts'`. Requisiten (`props`) u. a.
  `palm5`, `lavender`, `hibiscus`, `acacia`, `termite`, `grasstuft`, `violetrock`, `shells5`, `beachchair`, `parasol`,
  `towel`, `sandcastle`, `surfboard`, `lifebuoy`, `lighthouse`, `sailboat`, `candycane`, `cherry5`, `cupcake`, `donut`,
  `drum`, `balloons`, `pond5`, `jungletree`, `stonehead`, `templecolumn`, `obelisk5`, `tiki` (Flamme leuchtet), `tomb5`,
  `deadtree`, `bench5`, `lamppost5`, `luggage`, `cloud5`. Kacheln `batch: { tile: 48, origin: [−4, 4], freeTile: 128,
  freeOrigin: [−72, −72] }` (große Kacheln: Anflug über die ganze Kette im Budget).
- Freischaltung laut „Welt 5 – Level-Liste“: `5-1` frei, sobald Welt 5 offen ist; `5-2` nach 5-1; `5-3` (≥ 90 ★), `5-A`,
  `5-4` nach 5-2; `5-Kapitän`, `5-5` nach 5-4; `5-B`, `5-6` nach 5-5; `5-7` nach 5-6; `5-Zug`, `5-Burg` (≥ 100 ★) nach
  5-7; `W6` nach 5-Burg. `starScope: 'all'`, 31 Sterne. Schilder „ab 90 ★“, „ab 100 ★“.
- **Suchscheinwerfer im Takt**: Der Lichtfleck kreist je Zählzeit der Kartenmusik eine Achtelrunde weiter (`music.beat()`,
  Bewegung in den ersten 45 % der Zählzeit, dann Halt; ohne laufende Musik Ersatzuhr im Tempo von `course_world5_map`).
  Steht die Heldin im Fleck, färben sich Kegel und Fleck rot, über der Lampe blinkt ein „!“ (nur Optik). Rot-Blau-Flipper
  auf der Torten-Insel wechseln bei jedem Sprung der Heldin (`level.onJump`); der Kippquader-König auf dem Tempel kippt
  abwechselnd über die linke und rechte Kante (roter Landeboden-Hinweis, Staub). Test-Schnittstelle (additiv):
  `state().decor` = Vereinigung von `ev.liveInfo()` aller Eingänge – `searchlight { beat, step, moving, angle, source,
  theme, bpm, spot, alarm, shown }`, `flipper { color, flips }`, `kippquader { phase, side, tips }`.
- Registry-Modelle (Registry-Abfrage `hasModel`, je mit Dreiecks-Obergrenze über `beach5.modelTris`, sonst eigene
  sparsame Geometrie aus `beach5.js`/`decor_w5.js`): Welt 5 – `strandkorb` und `sonnenschirm` am Sonnenstrand (eingebacken
  in eine eigene Kachel `w5:strandmoebel`, damit sie nur in den Ansichten zählen, die sie sehen), `trapez` (zwei
  gegenläufig schwingende am Zirkuszelt), `roehrenkanone` (aufrecht auf dem Savannenberg, `load`/`fire` mit Rauchring),
  `lore` (`load: 'kristall'`, als Instanz-Vorlage: je Teil-Mesh ein InstancedMesh), `suchscheinwerfer` (Kopf dreht die
  Karte, `alarm`/`seen` aus dem Lichtfleck), `kippquader` (`style: 'tempel'`, Gesicht zur Kamera, `warn`/`tip`/`land`;
  dazu eine eigene Krone), `steinkopf` (als eigene Objekte, damit die Fern-Ausblendung sie beim Anflug ausblendet),
  `deco_w5_zuckerstange` (Requisite `candycane`); vorhandene: `kruemel`, `warp_box`, `pow_block`, `kanone_turm`,
  `pilzlingsturm`, `feuer_werfer`, `rammbock_bulle`. Bewusst eigene Geometrie (auf der Karte zu schwer, Stand der Modelle):
  `schluesselmuenze` (≈ 6 k Dreiecke je Münze × 5), `goldzug_waggon` (18–26 k), `torten_plateau` (≈ 21 k),
  `deco_w5_akazie` (≈ 5,8 k × 7), `termitenhuegel`, Giraffe/Zebra/Elefant (≈ 9 k), verstreute Requisiten (Strandkorb,
  Schirm, Tempelsäule, Steinkopf liegen in den Schatten-Kacheln vieler Ansichten), Palmen (`palm5`). Werden die Modelle
  leichter, greifen sie ohne Codeänderung (Kandidatenlisten `W5_PROP_MODELS`, Obergrenzen in `decor_w5.js`).
  **Hinweis Fern-Ausblendung:** `MapLod` merkt sich die Lage aller Kartenobjekte beim Aufbau – bewegte Kulissen-Teile
  (Lichtkegel, Ball, Funken, Rauch …) müssen schon beim Bau an ihrer Startlage stehen.
- Übergänge: Die Welt-4-Röhre `W5` und der Welt-Warp aus 4-2 führen ohne Codeänderung nach Welt 5 (Ankunft an der
  Rückweg-Röhre `W4`, `{ id: 'W4', world: 4, next: 4 }`, Röhre nach Südwesten zur Canyon-Insel am Horizont). Die Röhre
  `W6` zeigt „Welt 6 kommt bald!“; ein Welt-Warp nach Welt 6 aus einem Welt-5-Level endet über den vorhandenen Rückfall an
  dieser Röhre (entdeckt, Schranke versinkt). `tests/course_map_w4.mjs` Abschnitt 9 prüft jetzt die Ankunft in Welt 5
  (der „bald“-Rückfall wird in `tests/course_map_w5.mjs` mit Welt 6 geprüft).
- Test: `tests/course_map_w5.mjs` (Port 4250, Bilder `tests/out/cmap5_*.png`), Teilläufe `W5_TEIL=1|2|3` (Abschnitte
  2–4, 5–8, 9–14, je mit den Node-Prüfungen; gemessen bei Rechnerlast ≈ 10–15: 5,2 / 6,1 / 7,6 min).

Gemessen (scale 2, `tests/course_map_w5.mjs`, mit den Welt-5-Modellen): Kartenansichten Welt 5 37–80 Zeichenaufrufe
inkl. Schattenpass, 119–258 k Dreiecke; Ankunft durch die Glasröhre 73–88 / 208–249 k, Anflug 109 / 272 k (Budget
120 / 300 k). Welt 4 an der Röhre nach Welt 5 und bei der Ankunft von Welt 5 höchstens 66 / 162 k (Anflug Welt 4 mit
Lila-Insel am Horizont 108 / 274 k). Statische Kulisse Welt 5: 38 Kachel-Meshes, ≈ 167 k Dreiecke, ≈ 295
Kollisionsformen.

### Präzisierung (Mehrwelten-Karte): Halloween-Welt (Notiz)

- Dateien: `worlds/w31.js` (Daten: `MAP.world = 31`, `prefix: 'H'`, `alwaysOpen: true`, `worldLabel: 'Halloween'`, `title`/
  `short: 'Kürbisinsel'` → Weltname „Halloween · Kürbisinsel“, `travelToast`, Musik `course_halloween_map`, Rückfall
  `course_map`), `halloween.js` (Thema `map_halloween`: Abendrot und lila Nacht, großer Mond mit Gesicht – Registry-Modell
  `mond_gesicht`, sonst Canvas-Mond –, Sterne, lila Hügelkranz; Geländestile, Ränder, Requisiten, Streudeko, Stege `hwbridge`,
  Nachbarwelt-Stil `'halloween'`, Inselchen, Licht im Takt `hwGlow`, lebendige Kulisse `HwLife`), `decor_hw.js` (Kulissen der
  Halloween-Eingänge, geschmückte Glasröhre `dressPipeHW`). Additiv angebunden: `MapBuilder.js` (`map.kit === 'halloween'`),
  `scenery.js`, `entrances.js` (`decorateHW`, `dressPipeHW`, `def.ownSign`), `props.js` (Podestfarben), `MapBatcher.js`
  (`lod`), `CourseMapScene.js` (Präfix, `travelToast`, Regel-Feld `sign`, `worldList()`, Fern-Ausblendung), `MapHud.js`
  (`worldLabel`), `unlock.js` (`alwaysOpen`), `worlds/index.js` (Präfix-Tabelle), `level/CourseSave.js` (Sternzählung),
  `worlds/w1.js` (Röhre `HW`, Landzunge, Nachbarwelt).
- **Präfix-Mechanik:** `worlds/index.js` baut aus `MAP.prefix` die Tabelle Präfix → Welt: `worldOfLevel(id)` („H-1“ → 31,
  Zahl-Ids wie bisher, Unbekanntes → `null`), `worldPrefix(n)`; `listWorldMaps()` bleibt numerisch sortiert (1 … 5, 31).
  Benutzt von `CourseMapScene.worldOfLevel` (Rückkehr aus einem H-Level zeigt Welt 31), `courseSave.starsInWorld(31)` (zählt
  `31-…` und `H-…`) und `courseSave.unlocked(id, chain, minStars)` (Welt aus dem Präfix der Id). `unlock.worldOpen`: Welten
  mit `MAP.alwaysOpen` sind immer offen (kein Sternbedarf, auch ohne Eintrag in `worlds`). Alte Speicherstände laden
  unverändert (Welt 31 kommt erst beim Besuch in `worlds`); Welt-Zahlen 1–8 bleiben frei. `totalStars()` zählt die
  Halloween-Sterne mit (Sternschranken mit `starScope: 'all'` in Welt 2+).
- Weltdaten zusätzlich (alles optional): `worldLabel` (statt „Welt n“ im HUD-Weltschild, im großen Titel und auf dem Schild
  einer Röhre dorthin), `travelToast` (Meldung beim Abfahren dorthin), Regel-Feld `sign` (eigene Aufschrift des
  Röhrenschilds), `bats: [{ c: [x, y, z], r, n, speed }]`, `fog: { n } | false`; Eingangsfelder `dress: 'halloween'`
  (Glasröhre geschmückt), `ownSign` (Schild „Halloween!“ statt Holzschild, `signPos`, `signYaw`), `arrowSign: [x, y, z, yaw]`
  (Wegweiser), `deco: [Requisiten wie map.props]` (auch in Welt 1). Geländestile `hwgrass` (Standard)|`field` (Kürbisfeld in
  Furchen)|`cobble`|`village`|`maze`|`graveyard`|`moor`|`castle`|`hwrock`|`forest`|`hwbeach`; Ränder `edges: { hedge: 'hwstone',
  fence: 'hwpicket' }`, je Block auch `'hwiron'`|`'hwhedge'`. Requisiten `pumpkin` (`face: true|1|2`)|`pumpkins`|`hwlantern`|
  `hwtree` (`model: true` → Registry `halloween_baum`, `lanterns`)|`grave`|`hay`|`toadstool`|`candy`|`candycart`|`leaves`|
  `heather`|`cobweb`|`owl`|`hwhouse`|`hwrock`|`rowboat`|`candles`|`witchhat`|`ironfence`|`picket`|`hwhedge`. Kacheln
  `batch: { tile: 32, origin: [−4, 6], freeTile: 96, freeOrigin: [−56, −56] }`.
- Insel (begehbar, Höhe) und Eingänge (`kind`): A Ankunftsbucht y 1 – `W1` Glasröhre zurück (−16, 1, 36; nach Westen zur
  grünen Blockinsel am Horizont); A2 Lichtung im Kürbisfeld y 1 – `H-1` `pumpkinfield` (18, 1, 33; Vogelscheuche, Riesenkürbis,
  Strohballen, Maisstauden, Schubkarre); B Dorfplatz y 2 – `H-2` `spookvillage` (−2, 2, −3.6; Häuserzeile mit Licht, Katze auf
  dem Dach, Girlanden; Häuschen rings um den Platz); C Labyrinth-Wiese y 2 – `H-Kapitän` `pumpkinmaze` (−35, 2, 1; Hecken-
  Labyrinth mit Laternenkürbissen, Krümel `def.kruemel` mit Mini-Vampirumhang und Laterne, Scheibe „H-K“); D Friedhofsvorplatz
  y 3 – `H-3` `foggraveyard` (16, 3, −35.5; Tor zwischen Pfeilern mit Kürbislaternen, Eisenzaun `def.fence`, Gruft, Grabsteine
  mit Lachgesicht, Halloween-Baum mit Eule, Geist `def.ghost`, Nebel; der Friedhof dahinter ist nicht begehbar); E Hexenmoor
  y 4 – `H-4` `witchtower` (−27, 4, −53.5; schiefer Hexenturm, Hexenkessel `def.cauldron`, fliegender Besen); F Schlosshügel
  y 6 – `H-Burg` `spookcastle` (−4, 6, −91; Schloss mit Türmen und Fledermaus-Fahne, Graf Brummbär am Tor, Fledermaus-Schwarm,
  Scheibe „H-B“). Fünf dunkle Holzstege mit Laternen (`segments` `hwbridge`), fünf Schranken je 4 m: `H-2` (−4, 19),
  `H-Kapitän` (−20, 0), `H-3` (10, −16), `H-4` (−7, −38), `H-Burg` (−18, −72).
- Freischaltung laut „Halloween-Welt – Level-Liste“: `H-1` frei, sobald die Welt offen ist (immer); `H-2` nach H-1;
  `H-Kapitän` und `H-3` nach H-2; `H-4` nach H-3; `H-Burg` nach H-4; kein Sternbedarf. 18 Sterne, 5 Stempel. Eingänge zeigen
  „Bald“, solange es die Level nicht gibt.
- **Zugang aus Welt 1:** Landzunge (x 16…27, z 26…40) östlich des Startstrands mit der Glasröhre `HW` (21.5, 1, 34),
  Regel `{ id: 'HW', world: 31, next: 31, label: 'Halloween', stars: 0, sign: 'Halloween!' }` ohne `after` und ohne Schranke
  (immer frei), geschmückt mit Kürbissen, zwei Laternen, Fledermaus- und Wimpel-Girlande, Schild „Halloween!“, Wegweiser am
  Strand, Laub, Stroh. Die Röhre fährt nach Osten zur Kürbisinsel am Horizont (`neighbors` Stil `'halloween'`, `[258, 66]`);
  Ankunft in Welt 31 an `W1`, Rückweg dorthin; zurück in Welt 1 an `HW`. Welt 1 sonst unverändert (8 Schranken, 24 Sterne);
  `tests/course_map.mjs` zählt `HW` zu den von Anfang an freien Eingängen.
- **Licht im Takt:** Kürbisgesichter, Laternen und Kerzen teilen das Material `view.mats.hwglow` (in den Kacheln verschmolzen);
  dazu je Leuchte ein additiver Lichtschein (Billboard) und ein warmer Lichtfleck am Boden (je eine Instanz-Fläche, zusammen
  zwei Zeichenaufrufe). Helligkeit k = 0,58 + 0,42 · e^(−3,4 · Bruchteil der Zählzeit) (+ leichtes Kerzenflackern) aus
  `music.beat()` der Kartenmusik; ohne laufende Musik Ersatzuhr (Kartenzeit) im Tempo von `course_halloween_map` (fehlt das
  Thema: `course_map`). `state().decor.lanterns = { beat, step, pulse, k, source, theme, bpm, shown, halos, pools }` – auch in
  Welt 1 an der geschmückten Röhre. Tests stellen die Uhr mit `__audio.music.setManualClock(true)` / `advanceClock(s)`.
- Lebendige Kulisse (`state().decor`): `HwLife` – Fledermaus-Schwärme (`map.bats`, Instanzen mit Flügelschlag) und
  Nebelschwaden über dem Wasser (weiche Nebelkarten an den Ufern); `scarecrow { sway, model }`, `village { windows,
  houseModels }`, `maze { walls, kruemel }`, `ghost { phase: hidden|rise|peek|hide, peek, peeks, model }` (alle 7 s schaut der
  Geist hinter dem großen Grabstein hervor), `cauldron { bubbles, pops, model }`, `castle { graf, swarm }`.
- Registry-Modelle der Halloween-Welt (`models/kinds/*_hw.js`) mit Dreiecks-Obergrenze je Einsatz (`decor_hw.js` `bakeHw`/
  `live`, `halloween.js` `HW_PROP_MODELS`): eingebacken in eine kompakte Kachel je Eingang (`tile: 'hw:<Id>'`, Requisiten je
  16-m-Feld) mit `lod: true` – `MapBatcher` markiert sie (`userData.lod`), `MapLod` blendet sie jenseits von 90 m aus (Anflug,
  Ankunft); bewegte als eigene Objekte. Benutzt: `vogelscheuche` (wiegt sich), `kuerbis` (Riesenkürbis), `strohballen`,
  `maisstaude`, `dorfhaus_nacht` (nur das mittlere Haus, ohne Schattenwurf – drei Häuser à ≈ 11 k wären für die Ansicht des
  Dorfplatzes zu schwer), `laterne_hand` (Krümel), `gruft`, `grabstein`, `halloween_baum`, `kreisgeist_halloween` (schaut
  hervor), `hexenturm`, `hexenkessel`, `graf_brummbaer`, `fledermaus_schwarm`, `mond_gesicht`. Bewusst eigene Geometrie:
  Kürbisse und Laternen an den Wegen und im Feld (zu zahlreich – `kuerbis` ≈ 2,6 k, mit Gesicht ≈ 6,2 k, `kuerbislaterne`
  ≈ 4,8 k), Eisenzaun (`eisenzaun` ≈ 12,7 k je 13 m), Häuschen am Dorfplatz. Fehlt ein Modell, zeichnen `halloween.js`/
  `decor_hw.js` eigene Geometrie (gleiche Lage).
- Test: `tests/course_map_hw.mjs` (Port 4260, Bilder `tests/out/cmaphw_*.png`), Teilläufe `HW_TEIL=1|2|3|4` (Abschnitte
  2–4, 5–7, 8, 9–10, je mit den Node-Prüfungen; gemessen bei Rechnerlast ≈ 20: 6,5 / 5 / 6,5 / 3 min).

Gemessen (scale 2, `tests/course_map_hw.mjs`, mit den Halloween-Modellen): statische Kulisse Welt 31
51 Kachel-Meshes, ≈ 215 k Dreiecke, ≈ 175 Kollisionsformen; je Ansicht (Zeichenaufrufe inkl. Schattenpass / Dreiecke) Ankunft
92–94 / 248 k, Kürbisfeld 75 / 216 k, Gruseldorf 66 / 273 k (Höchstwert), Labyrinth 73 / 231 k, Friedhof 57 / 241 k,
Hexenturm 65 / 194 k, Gruselschloss 68 / 183 k, Anflug 91 / 225 k (Modell-Kacheln fern ausgeblendet). Welt 1 mit der
Halloween-Röhre höchstens 81 / 265 k (Startstrand vorher ≈ 72 / 240 k).

### Präzisierung (Mehrwelten-Karte): Welt 6 „Wolkeninseln“ (Notiz)

- Dateien: `worlds/w6.js` (Daten, `MAP.world = 6`, `kit: 'sky'`, Musik `course_world6_map`, Rückfall `course_map`), `sky6.js`
  (Thema `map_sky`: Himmelsverlauf, Sonne, ferne Wolkenberge; Materialien `w6glass`/`w6rainbow`, Geländestile mit Inselflanken
  und Unterseiten, Wolkenkragen, Ränder, Requisiten, Streudeko, Brücken-Segmente, Wolkenmeer `CloudSea`, Inselchen,
  Nachbarwelt-Stile `'sky'`/`'lavafort'`, lebendige Kulisse `SkyLife`, Taktuhr `beatNow6`), `decor_w6.js` (Kulissen der
  zwölf Welt-6-Eingänge, Stellvertreter `STAND_INS_W6`). Additiv angebunden: `MapBuilder.js` (`map.kit === 'sky'`: Gelände,
  Segmente, Streudeko, Requisiten-Ketten, `SkyLife`; Registry-Requisiten der Karte in Kacheln je 16-m-Feld mit `lod`),
  `scenery.js` (Wolkenmeer statt Meer/Schaum, tiefe Wolken ohne Schatten, Inselchen in einer Kachel, Nachbarwelt-Stile),
  `entrances.js` (`decorateW6`), `props.js` (Podestfarben), `CourseMapScene.js` (s. u.), `MapBatcher.js` (`zones`),
  `travel.js` (`departAlong`), `bake.js` (optionales `dt`). `worlds/w5.js` ist unverändert.
- Inseln (begehbar, Höhe) und Eingänge (`kind`), alle über einem Wolkenmeer (`sea: 0`), nach Norden ansteigend:
  A Ankunftsinsel y 10 mit Beerenhaus (−8, 10, 31.4) – `W5` Glasröhre zurück (−16, 10, 45; Röhre nach Südwesten zur
  Lila-Insel am Horizont), `6-1` `pipehills` Bergland mit Glasröhren-Netz (12, 10, 36; Münzen sausen durch die Röhren,
  Stachelkugeln, Warp-Box, Wolkenkanone mit Münzhimmel); S Steinkreis-Insel y 10.5 – `6-B` `stonecircle` (−45, 10.5, 24;
  Menhire mit Runen, Feuerschalen, Gegnergruppe 5 × `feuer_werfer` mit `memberOpts` Feuer/Hammer/Bumerang, Ausgang
  `exit` (−37.4, 10.5, 32)); B Geisterschiff-Bucht y 11 (Becken y 10.1) – `6-2` `ghostbay` (−6, 11, −4.6; schwankendes
  Geisterschiff, Kreisgeister, Wrack); C Fernost-Insel y 12.5 – `6-3` `fareast` Fernost-Halle (−56, 12.5, −12, „ab 110 ★“;
  zweistöckige Fantasie-Halle, Gong im Takt, Laternenbogen); D Dschungel-Insel y 12 um den lila Giftsee (y 11.2) – `6-4`
  `junglelake` (43, 12, −9.5; Floß, Giftblasen, Klettergitter, Giftblüten); E Festungs-Insel y 12.5 – `6-A` `pipefort`
  (75, 12.5, −22; Mauern mit Glasröhren, `cage`/`towers`/`gateAt`, Gegnergruppe 1 × `schubser_prinz`, Ausgang (67.4, 12.5,
  −22)); F Schnee-Wolkenberg y 14 (Gipfel y 17.5; fünf der sieben Windräder) – `6-5` `snowwind` (40, 14, −66; Pustewolke, Eisteich
  mit Glotzfisch, Iglu); G Himmelsfabrik y 15 mit Glückshaus (−20, 15, −73) – `6-6` `skyfactory` (−9, 15, −74; Zahnräder,
  Förderband, Dampf, Kessel); H Haus-Insel y 15 – `6-Haus` `throwhouse` Prüfungs-Haus (−51, 15, −76; Wurfmaschine,
  Zielscheibe); I Minen-Insel y 16 – `6-7` `minetower` (−15, 16, −117; Fördergerüst mit Seilrad und Aufzugkorb, Wuschel-
  Horde); J Wolkenstraße y 16.5 – `6-Panzer` `tankroad` (36, 16.5, −117; Panzerkolonne, Riesen-?-Block-Türme, Zündköpfe);
  K Zirkus-Gipfel y 20 (höchste Insel) – `6-C` `skycircus` Zirkuszelt (46, 20, −153, „ab 120 ★“; Würfelblase, Gelee-Brocken,
  Seilbahn hinab zur Wolkenstraße); L Röhren-Insel y 20 – `W7` Glasröhre (80, 20, −157; nach Nordosten zur Lava-Festung am
  Horizont). Zwölf Verbindungen (`segments`): Glasröhren (`glasstube`, begehbar wie Stege, Glasmantel mit Ringen und
  Leuchtstreifen), Wolkenbrücken (`cloudbridge`), rote Bogenbrücke (`redbridge`), Regenbogenbrücke (`rainbowbridge`, J → K);
  elf Schranken je 4 m.
- Freischaltung laut „Welt 6 – Level-Liste und Freischaltung“: `6-1` und `6-B` frei, sobald Welt 6 offen ist; `6-2` nach 6-1;
  `6-3` (≥ 110 ★) und `6-4` nach 6-2; `6-A` und `6-5` nach 6-4; `6-6` nach 6-5; `6-Haus` und `6-7` nach 6-6; `6-Panzer` nach
  6-7; `6-C` (≥ 120 ★) nach 6-Panzer; `W7` (`{ id: 'W7', world: 7, next: 7 }`) nach 6-C. `starScope: 'all'`, 34 Sterne,
  Stempel auf 6-1 … 6-7, 6-Panzer, 6-C. Schilder „ab 110 ★“, „ab 120 ★“, „Welt 6 / Wolkeninseln“.
- Weltdaten zusätzlich (alles optional): Geländestile `meadow` (Standard)|`hill`|`stone`|`rock`|`bay`|`pool`|`poison`|
  `fareast`|`jungle`|`fort`|`snow`|`snowpeak`|`metal`|`mine`|`cloud`|`circus`, je Block `under: { rect, depth, lite } | false`
  (Inselunterseite: Felsringe, Tropfsteine, Ranken, Leuchtkristalle), `sideTo` (Flanke bis zum Nachbarblock); Ränder `edges:
  { hedge: 'cloudhedge', fence: 'skyrail' }`, je Block `'quay'`|`'bamboo'`|`'rocks'`|`'snowbank'`. Requisiten `skytree`|
  `flowerbed`|`mushroom`|`skylamp`|`bush6`|`barrels`|`blossom`|`stonelantern`|`bamboo`|`jungletree6`|`fern`|`fir`|`snowman`|
  `icecrystal`|`snowdrift`|`crates6`|`gearpile`|`balloons6`|`drum6`. Lebendige Kulisse: `windmills: [[x, y, z, Höhe, yaw]]`,
  `airships: [{ c, r, speed, color }]` (ein InstancedMesh), `waterfalls: [{ at: [x, z], w, top, face: 'S'|'E'|'W' }]` (ein
  Mesh mit laufender Textur, Gischt), `rainbows: [{ c, r, yaw }]`, `cableways` (wie Welt 4), schwebende Felsbrocken
  (`SkyLife`, 28, Kachel `w6:schwebesteine`), `birdStyle: 'gull'`. **Kacheln:** `batch.zones: [[x0, z0, x1, z1, name]]` –
  Teile ohne benannte Kachel, deren Mitte in einer Zone liegt, kommen in die Kachel dieser Zone (je Insel ein Mesh je
  Material/Schattenwurf statt vieler angeschnittener Rasterkacheln); außerhalb gilt das Raster (`tile`/`origin`).
- **Windräder im Takt:** Die Flügel drehen je Zählzeit der Kartenmusik eine Achtelrunde weiter (`music.beat()`, Bewegung in
  den ersten 40 % der Zählzeit; Türme statisch, Rotoren als Instanzen); der Gong der Fernost-Halle schlägt bei jedem
  Taktanfang. Ohne laufende Musik zählt eine Ersatzuhr (Kartenzeit, `source: 'zeit'`) im Tempo von `course_world6_map`
  (fehlt das Thema: `course_map`). Test-Schnittstelle (additiv): `state().decor` = Vereinigung von `ev.liveInfo()` aller
  Eingänge und `built.life.liveInfo()` – `windmills { beat, step, moving, angle, source, theme, bpm, n, shown }`,
  `airships { n }`, `waterfalls { n }`, `floaters { n }`, `ship { roll, ghosts }`, `gong { strikes, bar, beat, source, theme }`,
  `raft { x, z }`, `pitch { throws }`, `mine { cage, wuschel }`, `w6models` (benutzte Registry-Modelle), `w6heavy` (zu
  schwere: Name → Dreiecke); `built.life.windInfo(t)`.
- Registry-Modelle (Obergrenze je Einsatz, `beach5.modelTris`; unbewegte in eine kompakte Kachel je Eingang `w6:<Id>` mit
  `lod: true`, bewegte als eigene Objekte; fehlt ein Modell, zeichnet `decor_w6.js` eigene Geometrie an gleicher Stelle):
  Welt 6 – `geisterschiff` (schwankt, Segel im Wind), `geisterschiff_wrack` (Bug, Mast), `gong` (`ring` mit progress aus der
  Taktuhr), `pilz_maske` (`mode: 'kopf'` am Obergeschoss der Halle), `giftbluete`, `riesenblatt`, `klettergitter`, `zahnrad`
  (vier, gegenläufig), `foerderband` (Band läuft mit den Kisten), `kessel`, `schacht_geruest` (12 m), `wuschel_horde`,
  `riesen_frageblock` (`grow: 1`, eingebacken mit `dt`), `pustewolke` (holt Luft/pustet), `glotzfisch` (Eisloch),
  `wuerfelblase` (hüpft), `createInstanced('gelee_brocken')`, `schubser_prinz` (Gegnergruppe 6-A, `anims: { walk: 'charge' }`),
  `kirschbaum` (Requisite `blossom`); vorhandene: `warp_box`, `cloud_cannon`, `schlittschuhe`, `iglu`, `kanone_turm`, `lore`,
  `panzer_fahrzeug`, `zirkuszelt`, `powerup_spiegel`, `feuer_werfer`, `seilbahn_gondel`. Bewusst eigene Geometrie (auf der
  Karte zu schwer bzw. zu zahlreich): `stachelkugel` (≈ 6,9 k je Kugel × 4), `wurfball` (≈ 6,7 k), `rankenschnapper` (≈ 8,5 k),
  `zuendkopf` (≈ 11 k), `feuer_schnappblume` (≈ 5,5 k, gleich an der Ankunftsinsel), Glasröhren (`glasroehre_teil` – die
  begehbaren Röhren-Brücken sind eigene Segmente), Papierlaternen, Fernost-Dächer.
- Gemeinsame Teile (additiv): `CourseMapScene.roamersOf(id)` (mehrere Gegnergruppen je Welt), Gegnergruppen-Feld
  `memberOpts: [opts, …]` (Modell-Optionen je Mitglied, reihum), Stellvertreter aus `STAND_INS_W6`; `travel.js` Eingangsfeld
  `departAlong: true` (Abfahrt in Richtung der ersten 24 m der Röhrenbahn statt geradeaus – Rückweg-Röhre `W5`).
- Übergänge: Die Welt-5-Röhre `W6` und ein Welt-Warp nach Welt 6 führen ohne Codeänderung nach Welt 6 (Ankunft an `W5`,
  Kamera `arriveCam`); die Aussage „Welt 6 kommt bald!“ der Welt-5-Notiz ist damit überholt. Zurück durch `W5` landet man an
  der Röhre `W6` in Welt 5 (entdeckt, Schranke 5-Burg von hinten passierbar). Die Röhre `W7` zeigt „Welt 7 kommt bald!“;
  ein Welt-Warp nach Welt 7 endet über den vorhandenen Rückfall an dieser Röhre. `tests/course_map_w5.mjs` Abschnitt 9
  prüft jetzt die Ankunft in Welt 6, `tests/course_map_hw.mjs` die Weltenliste 1–6, 31.
- Test: `tests/course_map_w6.mjs` (Port 4270, Bilder `tests/out/cmap6_*.png`), Teilläufe `W6_TEIL=1|2|3|4` (Abschnitte
  2–4, 5–7, 8–10, 11–14, je mit den Node-Prüfungen; gemessen ≈ 3,8 / 3,5 / 2,6 / 4,3 min). Noch nicht in `npm test`.

Gemessen (scale 2, `tests/course_map_w6.mjs`, mit den Welt-6-Modellen): statische Kulisse Welt 6 51 Kachel-Meshes, ≈ 276 k
Dreiecke, ≈ 310 Kollisionsformen; je Ansicht (Zeichenaufrufe inkl. Schattenpass / Dreiecke) Ankunft durch die Glasröhre
82–103 / 241–247 k, Start 85 / 213 k, Steinkreis 86 / 239 k, Bucht 92–95 / 241–254 k, Fernost 79 / 197 k, Dschungel
86 / 229 k, Festung 71 / 188 k, Schnee/Windräder 75–92 / 224–242 k, Fabrik 78 / 230 k, Glückshaus 95 / 222 k, Haus 58 /
158 k, Mine 62 / 196 k, Wolkenstraße 72 / 236 k, Zirkus 77–83 / 177–183 k, Röhren-Insel 53–63 / 138–141 k, Anflug 109 /
279 k (Höchstwert; Modell-Kacheln fern ausgeblendet). Welt 5 an der Röhre nach Welt 6 und bei der Rückkehr höchstens
53 / 116 k.

### Präzisierung (Mehrwelten-Karte): Welt 7 „Lava-Festung“ (Notiz)

- Dateien: `worlds/w7.js` (Daten, `MAP.world = 7`, `kit: 'lava'`, Thema `map_lava`, Musik `course_world7_map`, Rückfall
  `course_map`, `starScope: 'all'`), `lava7.js` (Thema `map_lava`: Abendhimmel violett → orange, warmer Nebel, Vulkan mit
  Rauchsäule und ferne Vulkankegel am Horizont; Geländestile, Ränder, Requisiten, Streudeko, Brücken-Segmente, Inselchen,
  Nachbarwelt-Stil `'erzpark'`, lebendige Kulisse `LavaLife`, Taktuhr `beatNow7`/`fountainEnvelope`), `decor_w7.js`
  (Kulissen der zwölf Welt-7-Eingänge). Additiv angebunden: `MapBuilder.js` (`map.kit === 'lava'`: Gelände, Segmente –
  zuerst `buildLavaSegment`, sonst `buildSkySegment` für `glasstube` –, Streudeko, Requisiten-Ketten, Ränder, `LavaLife`,
  Materialien `w6glass`/`w6rainbow` wie Welt 6), `scenery.js` (Inselchen in einer Kachel `w7:inselchen`, Wolken ohne
  Schattenpass, Nachbarwelt-Stil `'erzpark'`), `entrances.js` (`decorateW7`), `props.js` (Podestfarben). `CourseMapScene.js`,
  `MapBatcher.js`, `travel.js`, `unlock.js`, `layout.js` und `worlds/w6.js` sind unverändert.
- Inseln (begehbar, Höhe) und Eingänge (`kind`), eine Vulkaninsel im Abendmeer (`sea: 0`), rote und blaue Lavaflüsse und
  -seen (`style: 'basin'|'bluebasin'`, Lava-Oberfläche y 0.7) trennen die Bereiche, nach Norden ansteigend: A Ankunftsbucht
  y 1.5 mit Beerenhaus (−6, 1.5, 38.6) – `W6` Glasröhre zurück (−16, 1.5, 45; `departAlong`, nach Südwesten zu den
  Wolkeninseln am Horizont), `7-1` `bluefort` Werfer-Festung in der blauen Lava (16, 1.5, 44; Fels mit Mauern, Bergfried,
  Glasröhren mit H-Röhre, Feuerbälle im Bogen); AA Felsfläche im Lavasee y 1.2 – `7-A` `rockarena` (−48, 1.2, 24;
  Gegnergruppe heller `lavafelsen_koenig`); B Tempelplatz y 3 vor der Basalt-Steilwand (Lavafälle rot/blau) – `7-2`
  `templerock` Tempel-Eingang im Fels (0, 3, 2.4; Säulen, Stachelpanzer, Schaltfelder als Lauflicht); C Startplatz der
  Rennbahn y 4 – `7-3` `lavarace` (43, 4, −2; Rundkurs auf Stelzen über dem Lavafeld, Boost-Pfeile, Donut-Blöcke,
  Stachelwalze, sausende Kugeln); D Blaue-Lava-Ufer y 3.5 – `7-4` `bluecylinders` (−40, 3.5, −4; drehende Zylinder
  `zylinder_walze` in blauer Lava, Pfeilplattformen); DB Käfig-Insel y 3.5 – `7-B` `bluecage` (−77, 3.5, −4; blaue Mauern,
  Glasröhren, Gegnergruppe blauer `schubser_prinz`); E Turm-Ufer y 5 – `7-5` `lavatower` Turm im Lavasee (−41, 5, −40.5;
  13 m, Giftnebel-Kappe, Funken, Seilbahn `cableways` zur Turmspitze); EK Diorama-Insel y 5 – `7-Kapitän` `machinediorama`
  (−68, 5, −36; `lava_maschine`, `kruemel`, Stampfsteine); F Riff-Ufer y 3 an der Lagune (`style: 'lagoon'`) mit Glückshaus
  (3, 3, −47.6) – `7-6` `reeflagoon` Vulkan-Riff (−13, 3, −45; Korallen, Wutkaulquappen, Rammfisch); FC Hallen-Insel y 5 –
  `7-C` `werferhall` Werfer-Halle (29, 5, −44; Podest, roter Teppich, Feuerschalen, Brummbär-Banner, Gegnergruppe 4 ×
  `feuer_werfer`); G Kraterrand y 7 – `7-7` `crater` Vulkankrater (−7, 7, −96.5; Hufeisen-Krater mit steigender/sinkender
  Lava, zwei Fontänen und einem auftauchenden Lavadrachen); H Burghof y 8.5 – `7-Burg` `lavakeep` Lava-Burg (37, 8.5, −108,
  „ab 150 ★“; Torhaus mit Fallgitter, Bergfried mit flackernden Fenstern, Kampfwagen, Brummbär-Banner); I Röhren-Insel
  y 8.5 – `W8` Glasröhre (70, 8.5, −110; nach Nordosten zum dunklen Erzpark-Land am Horizont). Zwölf Verbindungen
  (`segments`): Basaltbrücken (`basaltbridge`), Kettenstege (`chainbridge`), ein Damm aus Basaltsäulen (`causeway`, F → G),
  die Zugbrücke (`drawbridge`, G → H) und eine Glasröhre (`glasstube`, H → I); zwölf Schranken.
- Freischaltung laut „Welt 7 – Level-Liste und Freischaltung“: `7-1` frei, sobald Welt 7 offen ist; `7-2` und `7-A` nach
  7-1; `7-3` und `7-4` nach 7-2; `7-B` und `7-5` nach 7-4; `7-Kapitän` und `7-6` nach 7-5; `7-C` und `7-7` nach 7-6;
  `7-Burg` nach 7-7 **und ≥ 150 ★** (alle Sterne); `W8` (`{ id: 'W8', after: '7-Burg', world: 8, next: 8 }`) nach 7-Burg;
  Rückweg `W6` (`{ id: 'W6', world: 6, next: 6 }`) immer frei. 32 Sterne, Stempel auf 7-1 … 7-7, 7-Burg. Schilder
  „Welt 7 / Lava-Festung“, „Beerenhaus“, „Glückshaus“, „ab 150 ★“.
- Weltdaten zusätzlich (alles optional): Geländestile `ash` (Standard)|`arena`|`temple`|`track`|`bluerock`|`fort`|`crater`|
  `castle`|`blacksand`|`rock`|`cliff`|`basin`|`bluebasin`|`lagoon`, je Lava-Block `flow: [dx, dz]` (Fließrichtung der
  Textur); Ränder `edges: { hedge: 'basaltwall', fence: 'battlement' }` (Basaltmauern, Zinnenmauern an den Lavaufern);
  Requisiten `basalt7` (Registry `basaltsaeule`)|`vrock7` (`vulkanfels`)|`spire7`|`lavaflower7`|`emberbush7`|`crates7`|
  `barrels7`|`cannon7`|`tires7`|`gears7`|`shells7`. Lebendige Kulisse (`LavaLife`): `fountains: [[x, y, z, Höhe, 'rot'|'blau']]`,
  `lavafalls: [{ at: [x, z], w, top, bottom, face: 'N'|'S'|'E'|'W', color }]`, `smoke: [[x, y, z, Stärke]]`,
  `flags: [[x, y, z, Masthöhe]]` (Brummbär-Fahnen), `torches: [[x, y, z, Farbe]]`, `boneflyers: [{ c, r, n, speed }]`
  (Knochenflieger), `fishjumps: [[x, y, z, Weite, yaw]]` (Platschfische), Lavablasen auf allen Lavaflächen;
  Nachbarwelt-Stil `'erzpark'`. Bewegte Teile sind je Art eine Instanz-Fläche und werden fern der Figur (> 45 m zwischen
  Kamera und Ziel) ausgeblendet; die Lavaflächen sind eine Fläche je Farbe mit laufender Textur.
- **Fontänen im Takt:** Je Zählzeit der Kartenmusik (`music.beat()`) sprühen abwechselnd die geraden und die ungeraden
  Fontänen (Hülle steigt in den ersten 14 % der Zählzeit, fällt bis 75 %, danach Ruhe). Ohne laufende Musik zählt eine
  Ersatzuhr (Kartenzeit, `source: 'zeit'`) im Tempo von `course_world7_map` (fehlt das Thema: `course_map`). Der Lavasee im
  Krater steigt und sinkt, der Lavadrache taucht alle 9 s auf, die Schaltfelder vor dem Tempel laufen als Lauflicht.
  Test-Schnittstelle (additiv): `state().decor` = Vereinigung von `ev.liveInfo()` aller Eingänge und
  `built.life.liveInfo()` – `fountains { beat, step, k, erupting, source, theme, bpm, n, shown }`, `lava { rot, blau }`,
  `lavafalls { n }`, `bubbles { n }`, `smoke { n }`, `boneflyers { n }`, `flags { n }`, `torches { n }`, `fish { n }`,
  `switches { lit, n }`, `race { length, orbs, light }`, `cylinders { n, angle, registry }`, `tower { height, fog, sparks }`,
  `diorama { kruemel, machine }`, `reef { corals, registryCorals, fin }`, `hall { banners }`, `crater { level, dragon }`,
  `keep { banners }`, `w7models` (benutzte Registry-Modelle), `w7heavy` (zu schwere: Name → Dreiecke);
  `built.life.fountainInfo(t)`.
- Registry-Modelle (Obergrenze je Einsatz über `beach5.modelTris`; unbewegte eingebacken, bewegte als eigene Objekte; fehlt
  ein Modell, zeichnet `decor_w7.js` eigene Geometrie an gleicher Stelle): Welt 7 – `basaltsaeule` (ohne Glutfugen),
  `festungsturm` (blau/Burg), `gitterboden`, `lava_maschine`, `lavagestein`, `riffkoralle`, `vulkanfels`, `zylinder_walze`;
  aus Welt 4 wiederverwendet – `brummbaer_banner`, `fallgitter`, `stachelpanzer`, `lavafelsen_koenig`; vorhandene –
  `stampfstein`, `kruemel`; Gegnergruppen `lavafelsen_koenig` (`variant: 'hell'`), `schubser_prinz` (`color: 'blau'`),
  `feuer_werfer`. Bewusst eigene
  Geometrie (auf der Karte zu schwer oder als Instanzen nötig): Knochenflieger (≈ 9,4 k), Platschfisch (≈ 7,6 k), Lavadrache
  (≈ 9,9 k), Baron-Kampfwagen (≈ 24,5 k), Lavabrocken (≈ 6,9 k), Pilzlingsturm (≈ 16 k), Zugbrücke (≈ 8,7 k), Fontänen,
  Lavablasen und Pfeilplattformen (bewegt, Instanzen).
- Übergänge: Die Welt-6-Röhre `W7` und ein Welt-Warp nach Welt 7 führen ohne Codeänderung nach Welt 7 (Ankunft an `W6`,
  Kamera `arriveCam`); die Aussage „Die Röhre `W7` zeigt „Welt 7 kommt bald!““ der Welt-6-Notiz ist damit überholt. Zurück
  durch `W6` landet man an der Röhre `W7` in Welt 6 (entdeckt, Schranke 6-C von hinten passierbar). Die Röhre `W8` zeigt
  „Welt 8 kommt bald!“; ein Welt-Warp nach Welt 8 endet über den vorhandenen Rückfall an dieser Röhre (Schranke 7-Burg
  von hinten passierbar). `tests/course_map_w6.mjs` (Abschnitte 1, 5, 9) prüft jetzt die Fahrt und den Warp nach Welt 7 und
  die Rückkehr, `tests/course_map_hw.mjs` die Weltenliste 1–7, 31.
- Test: `tests/course_map_w7.mjs` (Port 4280, Bilder `tests/out/cmap7_*.png`), Teilläufe `W7_TEIL=1|2|3|4` (Abschnitte
  2–4, 5–7, 8–10, 11–14, je mit den Node-Prüfungen; gemessen ≈ 4,0 / 5,2 / 4,4 / 7,0 min). Noch nicht in `npm test`.

Gemessen (scale 2, `tests/course_map_w7.mjs`, mit den Welt-7-Modellen): statische Kulisse Welt 7 52 Kachel-Meshes, ≈ 178 k
Dreiecke, ≈ 255–263 Kollisionsformen; je Ansicht (Zeichenaufrufe inkl. Schattenpass / Dreiecke) Ankunft durch die
Glasröhre 99–107 / 203–238 k, Start 86 / 197 k, Ankunftsbucht 69 / 188 k, Festung 80 / 191 k, Felsfläche 82–83 /
218–223 k, Tempel 89 / 243 k, Rennbahn 82 / 209 k, blaue Lava 78 / 249 k (Höchstwert Dreiecke), Käfig 76 / 187 k, Turm
73 / 200 k, Diorama 71 / 159 k, Riff 75 / 207 k, Werfer-Halle 83–96 / 240–241 k, Damm 89 / 197 k, Krater 55 / 159 k,
Burg 60–67 / 148–161 k, Röhren-Insel 48–60 / 125–126 k, Warp-8-Ankunft 88 / 228 k, Anflug 103 / 210 k. Welt 6 an der Röhre
nach Welt 7 und bei der Rückkehr höchstens 66 / 139 k.

### Präzisierung (Mehrwelten-Karte): Welt 8 „Brummbär-Rummelplatz“ (Notiz)

- Dateien: `worlds/w8.js` (Daten, `MAP.world = 8`, `kit: 'rummel'`, Thema `map_rummel`, Musik `course_world8_map`, Rückfall
  `course_map`, `starScope: 'all'`), `rummel8.js` (Thema `map_rummel`: Abendhimmel violett → orange, rosa Dunst, violette
  Hügel mit kleinen Türmen und Mond am Horizont; Geländestile, Ränder, Requisiten, Streudeko, Rummelsteg-Segment,
  Inselchen, Nachbarwelt-Stil `'vulkan'`, lebendige Kulisse `RummelLife`, Taktuhr `beatNow8`/`beatPulse`, Fahnen-Texturen,
  `gameFinished()`), `decor_w8.js` (Kulissen der zwölf Welt-8-Level-Eingänge). Additiv angebunden: `MapBuilder.js`
  (`map.kit === 'rummel'`: Gelände, Segmente – zuerst `buildRummelSegment`, dann `buildLavaSegment`, sonst
  `buildSkySegment` –, Streudeko, Requisiten-Ketten mit Rückfall auf die Welt-7-Requisiten, Kacheln `w8p:<x>|<z>` je
  24-m-Feld mit Fern-Ausblendung, Ränder, `RummelLife`, Materialien wie Welt 6/7), `scenery.js` (Inselchen in einer
  Kachel `w8:inselchen`, Wolken ohne Schattenpass, Nachbarwelt-Stil `'vulkan'`), `entrances.js` (`decorateW8`),
  `props.js` (Podestfarben), `MapBatcher.js` (Option `alias`: benannte Kacheln wiederverwendeter Bausteine umleiten, hier
  `w7:leuchten`/`w6:leuchten` → `w8:leuchten`; Kachel-Schlüssel in `mesh.userData.tile`), `CourseMapScene.js`
  (`worldNameOf(rule)`: Name der Zielwelt = `worldLabel` ihrer Karte, sonst `rule.worldLabel`, sonst „Welt n“ – für
  Schild, Ankunfts- und „kommt bald!“-Meldung). `travel.js`, `unlock.js`, `layout.js`, `lod.js` und `MapHud.js` sind
  unverändert.
- Inseln (begehbar, Höhe) und Eingänge (`kind`), ein Vergnügungspark im dunklen Baron-Land, Inseln im Abendmeer
  (`sea: 0`), gegen den Uhrzeigersinn zum Turm in der Mitte des Nordens: A Rummel-Eingang y 1.5 (Tor mit Wimpeln, Buden,
  Karussell, Beerenhaus (−8, 1.5, 33)) – `W7` Glasröhre zurück (−17, 1.5, 46; `departAlong`, nach Südwesten zur
  Lava-Festung am Horizont), `8-1` `rainfort` Regenfestung (Podest am Ufer (12, 1.5, 9.5), Festung auf dem nassen Fels im Meer; Mauern, Turm,
  Pfützen, eigene Regenwolke mit Regenschleier, zwei Stachelbrücken im Takt); Park y 1.0 mit Riesenrad (−8, 1, −8) und
  Westpark y 0.8 mit Achterbahn (Oval um (−46, 5)); B Dünenplatz y 2.5 – `8-2` `dunes8` (40, 2.5, −2; Baron-Sandstatue,
  Dünen, Schubfeld, Sandflosser); C Kekshof y 3.5 – `8-3` `cookiefactory` Keks-Fabrik (44, 3.5, −50; Halle mit drei
  Schornsteinen, Keksturm, Zuckerguss, Förderband, Keksrad, Zahnrad); D Bahnsteig y 4.5 mit Glückshaus (8, 4.5, −68.6) –
  `8-Zug` `baronstation` (−6, 4.5, −66; Bahnsteigdach mit Uhr, Baron-Express pendelt auf dem Gleis, Dampfwölkchen);
  E Nacht-Festung y 5.5 – `8-4` `nightfort` (−62, 5.5, −65.5; dunkle Mauern und Rundtürme, blau glimmende Leuchtstege
  bis auf die Westmauer); H Haus-Insel y 5 – `8-Haus` `clawhouse` Prüfungs-Haus (−68, 5, −30; Krallen-Anzug dreht sich);
  F Seeufer y 5 – `8-5` `lakefort` Unterwasser-Festung im See y 1.2 (−58, 5, −107; Türme, Luftblasen, Wasserwürfel);
  G Spukgarten y 6.5 – `8-6` `darkmansion` Spukhaus (−31, 6.5, −105; flackernde Fenster, Spukspiegel, Geister);
  I Inferno-Plateau y 7.5 mit Lavabecken – `8-7` `inferno` (20, 7.5, −92; Kristall-Felsklotz rollt hin und her,
  Fontänen, Rauch); J Zirkusplatz y 8 – `8-A` `goldtent` (37, 8, −116; Zirkuszelt, goldene Würfelblase, Goldsterne);
  K Zirkusplatz Ost y 8 – `8-B` `snaketent` (58, 8, −82; Zelt, rosa Schlangenkönig steigt aus dem Korb, Lavapfützen);
  TP Turmplatz y 9.5 – `8-Burg` `barontower` Baron-Turm (0, 9.5, −125, „ab 190 ★“; Turm 40 m mit Brummbär-Büste,
  oben das leuchtende Glas der Freunde, roter Teppich, Autowrack, zwei Turm-Banner, Fackeln); S Sternen-Platz y 9.5 –
  `WS` Glasröhre zur Welt Stern (−23, 9.5, −132; Scheibe „★“, Röhre steigt nach Nordwesten in den Himmel). Verbindungen
  (`segments`): Rummelstege (`rummelbridge`, A → B, B → C, C → D, E → H, I → J, I → K), Kettenstege (`chainbridge`,
  D → E, E → F, F → G), Basaltbrücke (G → I), Zugbrücke (`drawbridge`, I → TP), Glasröhre (`glasstube`, TP → S); zwölf
  Schranken.
- Freischaltung laut „Welt 8 – Level-Liste und Freischaltung“: `8-1` frei, sobald Welt 8 offen ist; dann der Reihe nach
  `8-2`, `8-3`, `8-Zug`, `8-4`, `8-5`, `8-6`, `8-7`; `8-Haus` nach 8-4 (10 Sterne, kein Stempel); `8-A` und `8-B` nach
  8-7; `8-Burg` nach 8-A **und** 8-B (`after: ['8-A', '8-B']`, Liste = alle) **und ≥ 190 ★** (alle Sterne; Hinweis
  „Benötigt 190 Sterne (x/190)“); `WS` (`{ id: 'WS', after: '8-Burg', world: 9, next: 9, worldLabel: 'Welt Stern' }`)
  nach 8-Burg, solange es keine Welt-9-Karte gibt mit „Welt Stern kommt bald!“ (Schild „Welt Stern / bald!“, ein
  Welt-Warp nach Welt 9 endet über den vorhandenen Rückfall an dieser Röhre); Rückweg `W7` (`{ id: 'W7', world: 7,
  next: 7 }`) immer frei. 43 Sterne. Schilder „Welt 8 / Brummbär-Rummelplatz“, „Beerenhaus“, „Glückshaus“, „ab 190 ★“.
- Weltdaten zusätzlich (alles optional): Geländestile `plaza` (Standard)|`parkgrass`|`rainrock`|`sand`|`cookie`|`station`|
  `rails`|`nightstone`|`shore`|`spook`|`house`|`circus`|`tower`|`starplaza`|`towerbase`|`lake` (Seewasser)|`inferno`
  (Kraterboden) und die Lava-Stile aus Welt 7; Ränder `edges: { hedge: 'parkwall', fence: 'parkrail' }`; Requisiten
  `bush8`|`lamp8`|`crystal8`|`balloons8`|`arch8`|`booth8`|`dune8`|`statue8`|`pilzstatue8`|`cookietower8`|`icing8`|`algae8`|
  `pillar8`|`grate8`|`wreck8`|`track8`|`curve8`|`looping8`|`tent8`|`rainwall8`|`raintower8`|`puddle8` (sonst die
  Welt-7-Arten `…7`); Segment `rummelbridge`. Lebendige Kulisse (`RummelLife`): `lights: [{ a, b, h?, hb?, sag?, posts?,
  solid? }]` (Glühbirnenketten zwischen Masten), `wheel: { pos, radius, speed }`, `carousel: { pos, speed, r }`,
  `coaster: { pts, base, cars, speed }` (geschlossene Bahn), `balloons: [{ at, n, h }]` (steigende Brummbär-Ballons),
  `flags: [[x, y, z, Masthöhe]]`, `banners: [{ pos, yaw, w, h }]` (Turm-Banner), `fireworks: [[x, y, z]]` (nur nach dem
  Spielende); dazu aus Welt 7 `fountains`, `smoke`, `boneflyers`, `torches`, `fishjumps`, Lavablasen. Je Eingang
  zusätzliche Felder in `entrances[]` (z. B. `bridges`, `statues`, `dunes`, `walls`, `towers`, `steps`, `cube`, `roll`,
  `puddles`, `carpet`, `friends`, `wreck`, `jar`). Bewegte Teile sind je Art eine Instanz-Fläche; Ballons werden nur im
  Bild gezeichnet, die Lava-Effekte haben feste Hüllkugeln, Fahnen/Achterbahn-Wagen/Ballons fern der Figur aus.
- **Glühbirnen im Takt:** Die Birnen der Ketten bilden drei Gruppen; je Zählzeit der Kartenmusik (`music.beat()`) leuchtet
  die nächste Gruppe hell auf (Puls `beatPulse`: hell am Schlag, klingt ab), die Stachelbrücken der Regenfestung fahren
  abwechselnd je Zählzeit aus, die Leuchtstege der Nacht-Festung glimmen als Welle. Ohne laufende Musik zählt die
  Ersatzuhr im Tempo von `course_world8_map` (128 BPM; fehlt das Thema: `course_map`). Riesenrad und Karussell drehen,
  die Achterbahn-Wagen fahren, Ballons steigen, der Baron-Express pendelt, es regnet über der Regenfestung.
- **Nach dem Spielende** (`courseSave.data.finished === true`, Abspann des Motors): Der Turm ist befreit – bunte Herz-/
  Stern-Fahnen statt der Brummbär-Fahnen (gleiche Fläche, andere Textur), fröhliche Turm-Banner, das Glas oben offen und
  leer, die Freunde (`friendGeo` aus `w8Geos.js`) hüpfen und winken vor dem Turm, Feuerwerk über dem Rummel (eine
  Instanz-Fläche); ohne Spielende bleibt alles wie vorher. Der Abspann zählt Welt 8 in seiner Weltenliste aus dieser Karte
  („Welt 8 · Brummbär-Rummelplatz“, genau einmal) und kehrt mit `{ from, credits: true }` in die befreite Welt 8 zurück
  (Pokal im HUD).
- Test-Schnittstelle (additiv): `state().decor` = Vereinigung von `ev.liveInfo()` aller Eingänge und
  `built.life.liveInfo()` – `bulbs { beat, step, k, source, theme, bpm, n, shown }`, `flags { n, banners, style:
  'baron'|'herz' }`, `wheel { registry, angle }`, `carousel { registry, angle }`, `coaster { cars, u, length, registry }`,
  `balloons { n, shown }`, `fireworks { n, sparks, open }|null`, `finished`, `w8models`, `w8heavy`, die Welt-7-Felder
  (`fountains`, `smoke`, `boneflyers`, `torches`, `fish`, …) sowie je Eingang `spikebridges { n, spikes, step, up }`,
  `rain { drops, cloud, walls }`, `dunes { fin, statues }`, `cookie { angle, wheel, gear, band }`, `train { x, wagons }`,
  `nightfort { steps, registry, wave }`, `lakefort { towers, registryParts, cube }`, `clawhouse { spin, registry }`,
  `mansion { flicker, mirror, ghosts, peek }`, `inferno { rock, registry }`, `goldtent { stars, spin }`,
  `snaketent { sway }`, `tower { height, jar: 'gefangen'|'offen', glow, friends, hop }`; `built.life.bulbState(t)`,
  `fireworkInfo(t)`.
- Registry-Modelle (Obergrenze je Einsatz über `beach5.modelTris`; unbewegte eingebacken, bewegte als eigene Objekte; fehlt
  ein Modell, zeichnet `decor_w8.js`/`rummel8.js` eigene Geometrie an gleicher Stelle): Welt 8 – `baron_turm`,
  `riesenrad_kulisse`, `karussell`, `achterbahn` (Wagen), `rummel_bude`, `brummbaer_ballon`, `zirkuszelt`, `wuerfelblase`
  (gold), `regenfestung`, `baron_sandstatue`, `duene`, `keksfabrik`, `keksrad`, `keks_zahnrad`, `leuchtsteg`,
  `wasserfestung`, `wasserkoerper`, `spukspiegel`, `helm_licht`, `kristall_felsklotz`, `lavapfuetze`, `autowrack`,
  `powerup_krallen`, `schubfeld`; zu schwer: keines. Bewusst eigene Geometrie: Baron-Express (eine Fläche), Fabrikhalle,
  Bahnsteigdach, Nacht-Festungsmauern, Spukhaus, rosa Schlangenkönig, Achterbahn-Bahn, Glühbirnenketten, Regenwolke,
  Stachelbrücken, Freunde-Glas, Feuerwerk.
- Übergänge: Die Welt-7-Röhre `W8` und ein Welt-Warp nach Welt 8 führen ohne Codeänderung nach Welt 8 (Ankunft an `W7`,
  Kamera `arriveCam`); die Aussage „Die Röhre `W8` zeigt „Welt 8 kommt bald!““ der Welt-7-Notiz ist damit überholt.
  Zurück durch `W7` landet man an der Röhre `W8` in Welt 7 (entdeckt, Schranke 7-Burg von hinten passierbar).
  `tests/course_map_w7.mjs` (Abschnitte 1, 5, 9) prüft jetzt Fahrt, Warp und Rückkehr, `tests/course_map_hw.mjs` die
  Weltenliste 1–8, 31.
- Test: `tests/course_map_w8.mjs` (Port 4290, Bilder `tests/out/cmap8_*.png`), Teilläufe `W8_TEIL=1|2|3|4` (Abschnitte
  2–4, 5–7, 8–10, 11–14, je mit den Node-Prüfungen; gemessen ≈ 3,6–4,4 / 2,5–3,2 / 2,1–2,3 / 3,8–4,8 min). Noch nicht in
  `npm test`.

Gemessen (scale 2, `tests/course_map_w8.mjs`, mit den Welt-8-Modellen): statische Kulisse Welt 8 59 Kachel-Meshes, ≈ 275 k
Dreiecke, ≈ 280–291 Kollisionsformen; je Ansicht (Zeichenaufrufe inkl. Schattenpass / Dreiecke) Ankunft durch die
Glasröhre 82–90 / 232–249 k, Start 68 / 183 k, Eingang 65 / 222 k, Karussell 69 / 225 k, Regenfestung 73–82 / 250–258 k,
Dünen 63–80 / 249–275 k (Höchstwert Dreiecke), Keks-Fabrik 77 / 205 k, Bahnhof 77 / 174 k, Nacht-Festung 73 / 200 k,
Haus 75 / 162 k, Seeufer 55 / 134 k, Spukhaus 74 / 185 k, Inferno 65 / 171 k, Zelte 54–56 / 147–154 k, Zugbrücke und
Turm-Schranke 73–75 / 173–175 k, Turmplatz 67–73 / 162–178 k, Riesenrad 60 / 251 k, Glühbirnen 68 / 225 k, Sternen-Röhre
64 / 147 k, Warp-9-Ankunft 85 / 191 k, befreiter Turm 85 / 199 k, befreiter Rummel 76 / 256 k, Anflug 91 / 239 k
(Höchstwert Zeichenaufrufe). Welt 7 an der Röhre nach Welt 8 und bei der Rückkehr höchstens 88 / 228 k.

### Präzisierung (Mehrwelten-Karte): Welt Stern „Sternenzelt“ (Notiz)

- Dateien: `worlds/w9.js` (Daten, `MAP.world = 9`, `prefix: 'S'`, `worldLabel: 'Welt Stern'`, `title`/`short: 'Sternenzelt'` →
  Weltname „Welt Stern · Sternenzelt“, `travelToast: 'Auf ins Sternenzelt!'`, `kit: 'star'`, Thema `map_star`, Musik
  `course_worldstar_map`, Rückfall `course_map`, `starScope: 'all'`), `sterne9.js` (Thema `map_star`: Kuppel wie das
  Stern-Grundthema `starspace` des Motors über `backdrop_star.js` `spaceSky`/`animateStar` – Sterne rundum, Pastell-Nebel, ferne
  Ringplaneten, Sternschnuppen-Streifen –; Geländestile, Ränder, Sternengeländer `starRims`, Requisiten, Streudeko,
  Brücken-Segmente, Sternenmeer `StarSea`, Inselchen, Nachbarwelt-Stil `'rummelfern'`, lebendige Kulisse `StarLife`, Taktuhr
  `beatNow9`/`beatPulse9`), `decor_star.js` (Kulissen der zehn Sternenzelt-Eingänge). Additiv angebunden: `MapBuilder.js`
  (`map.kit === 'star'`: Gelände, Segmente `buildStarSegment`, Streudeko, Requisiten-Ketten, Requisiten-Kacheln `w9p:<x>|<z>` je
  24-m-Feld mit Fern-Ausblendung, Ränder, `StarLife`), `scenery.js` (Sternenmeer statt Meer/Schaum/Glitzern, keine Wolken,
  Inselchen in einer Kachel `w9:inselchen`, Nachbarwelt-Stil `'rummelfern'`), `entrances.js` (`decorateStar`), `props.js`
  (Podestfarben). `CourseMapScene.js`, `MapBatcher.js`, `travel.js`, `unlock.js`, `layout.js`, `lod.js`, `MapHud.js`,
  `worlds/index.js` und `worlds/w8.js` sind unverändert (Präfix 'S' über die vorhandene Präfix-Tabelle, Weltname über `worldLabel`).
- Inseln (begehbar, Höhe) und Eingänge (`kind`), alle schwebend im All über dem Sternenmeer (`sea: 0`, Inseln ab y 10), im Zickzack
  nach Norden ansteigend: A Sternenhafen y 10 mit Beerenhaus (−8, 10, 33.5), Sternwarte, Raketen-Startplatz – `W8` Glasröhre zurück
  (−20, 10, 47; `departAlong`, nach Südwesten hinab zum Rummelplatz tief unten am Horizont); A2 Regenbogeninsel y 10.5 – `S-1`
  `rainbowisle` (18, 10.5, 34; Sternen-Torbogen, großer leuchtender Regenbogen auf Wolken, Hüpfmaus, Sternring); B
  Planetoiden-Plattenfeld y 12 – `S-2` `platefield` (28, 12, 4; Farbplatten-Schachbrett, schwebende Drehplatten, Plattentreppe an
  einer Sternenwand, kleiner Eisplanet); K Diorama-Insel y 12.5 – `S-Kapitän` `spindiorama` Krümels Drehdiorama (63, 12.5, 7.5;
  Drehscheibe, Krümel fährt mit, zwei Funkenflämmchen; Scheibe „S-K“); C Holz-Walzen-Insel y 13.5 – `S-3` `rollerisle`
  (21, 13.5, −30; Schienenwalze rollt auf dem Schienenpaar, Holz-Athletik mit drei drehenden Walzen); D Wolkeninsel y 14.5 –
  `S-4` `goalcloud` (−14, 14.5, −27; der Zielmast mit Flügeln fliegt Kreise, Landewolke, Donut-Blöcke, Boost-Pfeile); E
  Retro-Blockland y 16 mit Glückshaus (−38, 16, −79.4) – `S-5` `blockland` (−26, 16, −66; ?-Block-Reihe, Grasblock-Treppe,
  Pixel-Hügel, Retro-Wolken und -Büsche, wachsender Riesen-?-Turm, kleine Laufbombe); F Wabeninsel y 17 – `S-6` `honeycomb`
  (16, 17, −70; Wabenboden aus Sechsecken, Wabenfeld, Lavawaben, Wabensäulen, Brummer, Wurfsichel); G Riesen-Dschungel y 18 –
  `S-7` `giantjungle` (59, 18, −86; Riesenblume, Riesenpilz, Riesenblätter, Lianen, Riesengras, Farne, Großrollpilz); H
  verschneiter Nebelfriedhof y 19.5 – `S-8` `fogyard` (34, 19.5, −124; Schneegräber mit Lachgesicht, Eisenzaun, Nebelbänke,
  zwei steigende/sinkende Nebelplattformen, Kreisgeist, Schneefall, Schneetannen); I Kanonen-Station y 21 – `S-9`
  `cannonstation` (−14, 21, −138, „ab 280 ★“; Glaskuppel, Antenne, Rohrschiene mit Weiche und fahrendem Schienenbrett,
  Sternkanone mit fliegender Kanonenkugel, Kanonen-Helm, Neonbogen, Neonfugen, Triebwerksringe unter der Insel); J Röhren-Insel
  y 19.5 – `WP` Glasröhre zur Welt Pilz (38, 19.5, −157; Riesenpilze, Röhre nach Nordosten zum großen Pilz-Planeten). Elf
  Verbindungen (`segments`): Regenbogenwege (`rainbowway`: sieben Farbbahnen, weiße Wülste, leuchtende Goldsterne) und
  Sternenbrücken (`starbridge`: nachtblauer Steg mit goldenen Sternplatten, Sternenpfosten, Goldkordel, hängende Kristalle),
  Kollision wie `bridge`; zehn Schranken je 4 m.
- Freischaltung laut „Bonuswelten – Level-Liste und Freischaltung“ (Welt Stern): `S-1` frei, sobald die Welt offen ist; `S-2`
  nach S-1; `S-Kapitän` und `S-3` nach S-2 (Abzweig zur Diorama-Insel); `S-4` … `S-8` nacheinander; `S-9` nach S-8 **und
  ≥ 280 ★** (alle Sterne; Hinweis „Benötigt 280 Sterne (x/280)“); `WP` (`{ id: 'WP', after: 'S-8', world: 10, next: 10,
  worldLabel: 'Welt Pilz' }`) nach S-8, ohne Karte der Welt Pilz „Welt Pilz kommt bald!“ (Schild „Welt Pilz / bald!“; ein
  Welt-Warp nach Welt 10 endet über den vorhandenen Rückfall an dieser Röhre); Rückweg `W8` (`{ id: 'W8', world: 8, next: 8 }`)
  immer frei. 32 Sterne, Stempel auf S-1 … S-9. Welt 9 ist offen, sobald die Welt-8-Röhre `WS` frei ist (nach 8-Burg) oder
  Welt 9 entdeckt wurde. Schilder „Welt Stern / Sternenzelt“, „Beerenhaus“, „Glückshaus“, „ab 280 ★“.
- Weltdaten zusätzlich (alles optional): Geländestile `starplaza` (Standard, lavendelblaue Platten mit Goldsternchen)|`rainbow`|
  `galaxy` (rot-blaue Platten, weiße Fugen, Sterne)|`diorama`|`wood`|`cloud` (Wolkenplatte ohne Fels)|`retro` (Pixelgras,
  Blockfugen vorn)|`honey` (Sechseck-Waben)|`jungle`|`snowfog` (Eiszapfen unten)|`tech` (Neonfugen, Warnstreifen)|`asteroid`, je
  Block `under: false | { depth }` (felsige Unterseite mit leuchtenden Kristallen); Ränder `edges: { hedge: 'starhedge', fence:
  'starrail' }`, an Inselrändern zum All setzt `starRims` ein niedriges Sternengeländer mit leuchtenden Sternen (Brückenränder
  ausgenommen); Requisiten `lamp9`|`crystal9`|`star9`|`rocket9` (Registry `spielzeugrakete`)|`planet9` (`planet` mit kind)|
  `crates9`|`boost9` (`boost_arrow`)|`donut9` (`donut_block`)|`rbush9` (`retro_busch`)|`rblock9` (`retro_block`)|`hexpillar9`
  (`wabensaeule`)|`plant9` (`riesenpflanze`)|`fern9`|`fir9`|`grave9` (`schneegrab`)|`antenna9` (`weltraum_antenne`)|`neon9`|
  `scope9`|`pad9`|`cloud9`. Lebendige Kulisse (`StarLife`): `planets: [{ kind, pos (Mitte), size, speed }]` (Registry `planet` mit
  `kind`, drehen sich), `rockets: [{ c, r, h, speed, color }]` (Spielzeugraketen mit Flamme kreisen), `shooting: { n, period }`
  (Sternschnuppen `sternschnuppe` sausen in Abständen schräg durchs Bild – relativ zum Blickpunkt der Kamera), `twinkle:
  { perIsland, seed }` (funkelnde Sterne rings um alle begehbaren Inseln, eine Instanz-Fläche). `StarSea`: zwei Sternschichten
  tief unter den Inseln (Parallaxe) und weiche Nebel (ein Mesh). Kacheln `batch.zones` je Insel (zwölf Zonen).
- **Funkelnde Sterne im Takt:** Die Sterne rings um die Inseln bilden drei Gruppen; je Zählzeit der Kartenmusik (`music.beat()`)
  leuchtet die nächste Gruppe hell auf (Puls `beatPulse9`: hell am Schlag, klingt ab); die Farbplatten des Plattenfelds wechseln je
  Zählzeit die Farbe (Schachbrett, Aufleuchten am Schlag), die Drehplatten kippen je Takt, die Waben leuchten Ring für Ring, der
  Riesen-?-Turm wächst über zwei Takte und schrumpft wieder (Kopf hüpft je Takt). Ohne laufende Musik zählt die Ersatzuhr
  (Kartenzeit, `source: 'zeit'`) im Tempo von `course_worldstar_map` (126 BPM; fehlt das Thema: `course_map`).
- Test-Schnittstelle (additiv): `state().decor` = Vereinigung von `ev.liveInfo()` aller Eingänge und `built.life.liveInfo()` –
  `twinkle { beat, step, k, source, theme, bpm, n, shown }`, `planets { n, registry, kinds, angle }`, `rockets { n, registry, a }`,
  `shooting { n, registry, active }`, `rainbow { mouse, hop, ring, ringA }`, `plates { tiles, flips, step, flash, tilt, registry }`,
  `diorama { angle, registry, kruemel }`, `roller { z, angle, registry, logs }`, `goalpole { angle, y, registry }`, `blockland
  { tower, grow, bumps, bomb }`, `honeycomb { cells, lit, flash, registry, lava, brummer, sickle }`, `jungle { roll, roller }`,
  `fogyard { graves, banks, platforms, fade, ghost, ga, snow }`, `station { brett, registry, ball, helm }`, `w9models` (benutzte
  Registry-Modelle), `w9heavy` (zu schwere: Name → Dreiecke); `built.life.twinkleState(t)`.
- Registry-Modelle (Obergrenze je Einsatz über `beach5.modelTris`; unbewegte eingebacken in die Kachel `w9:<Id>` mit
  Fern-Ausblendung, bewegte als eigene Objekte mit Sichtprüfung; fehlt ein Modell, zeichnen `decor_star.js`/`sterne9.js` eigene
  Geometrie an gleicher Stelle): Bonuswelten – `planet` (kind ring/pilz/blume/eis), `sternschnuppe`, `spielzeugrakete`,
  `sternen_torbogen`, `farbplatte`/`drehplatte`/`wabe` (Instanzen über `createInstanced`), `plattenwand`, `diorama_drehscheibe`,
  `walzen_schiene`, `schienenwalze`, `zielmast_fluegel`, `retro_block`, `retro_wolke`, `retro_busch`, `riesen_frageblock_turm`,
  `wabensaeule`, `riesenpflanze`, `schneegrab`, `nebelbank`, `nebelplattform`, `weltraum_kuppel`, `weltraum_antenne`,
  `brett_schiene`, `schienenbrett`, `weiche`, `kanonenkugel_tritt`; vorhandene – `kruemel`, `huepfmaus`, `star_ring`,
  `boost_arrow`, `donut_block`, `brummer`, `wurfsichel_item`, `grossrollpilz`, `kreisgeist`, `helm_kanone`; zu schwer: keines.
  Bewusst eigene Geometrie: Laufbombe (Registry ≈ 11 k Dreiecke, 10 Meshes), Funkenflämmchen (Instanzen), Sternkanone,
  Holz-Athletik, Pixel-Hügel, Lianen, Eisenzaun, Sternwarte, der große Regenbogen.
- Übergänge: Die Welt-8-Röhre `WS` und ein Welt-Warp nach Welt 9 führen ohne Codeänderung ins Sternenzelt (Ankunft an `W8`,
  Kamera `arriveCam`); die Aussage „solange es keine Welt-9-Karte gibt mit „Welt Stern kommt bald!““ der Welt-8-Notiz ist damit
  überholt (Schild jetzt „Welt Stern / Sternenzelt“). Zurück durch `W8` landet man an der Röhre `WS` in Welt 8 (entdeckt,
  Schranke 8-Burg von hinten passierbar). Die Röhre `WP` zeigt „Welt Pilz kommt bald!“; **Welt Pilz nachrüsten:** nur
  `worlds/w10.js` mit `MAP.world = 10` anlegen samt Rückweg-Röhre `{ id: 'WS', world: 9, next: 9 }`; dann führen die Röhre `WP`
  und ein Welt-Warp nach Welt 10 ohne Codeänderung dorthin. Der Abspann (`?credits=1`) nennt in „Die Reise“ jetzt auch
  „Welt Stern · Sternenzelt“ (genau einmal, nach Welt 8) und kehrt unverändert in die befreite Welt 8 zurück.
  `tests/course_map_w8.mjs` (Abschnitte 1, 9) prüft jetzt Fahrt, Warp und Rückkehr ins Sternenzelt, `tests/course_map_hw.mjs`
  die Weltenliste 1–9, 31.
- Test: `tests/course_map_star.mjs` (Port 4915, Bilder `tests/out/cmapS_*.png`), Teilläufe `ST_TEIL=1|2|3` (Abschnitte 2–5, 6–9,
  10–13, je mit den Node-Prüfungen; gemessen ≈ 3,4 / 1,9 / 5,6 min). Noch nicht in `npm test`.

Gemessen (scale 2, `tests/course_map_star.mjs`, mit den Bonuswelt-Modellen): statische Kulisse Welt 9 52 Kachel-Meshes, ≈ 229 k
Dreiecke, ≈ 211–221 Kollisionsformen; je Ansicht (Zeichenaufrufe inkl. Schattenpass / Dreiecke) Ankunft durch die Glasröhre
42–84 / 71–160 k, Start 68 / 134 k, Hafen 63–68 / 144–150 k, Regenbogeninsel 64–70 / 135–143 k, Plattenfeld 67–69 / 146–168 k,
Diorama 68 / 125 k, Sternenbrücke 66 / 127 k, Holz-Walzen 59–63 / 152–169 k, Wolkeninsel 67–68 / 175–191 k (Höchstwert
Dreiecke), Blockland 67–72 / 181–186 k, Glückshaus 66 / 146 k, Waben 65 / 175 k, Dschungel 63–67 / 180–181 k, Nebelfriedhof
75–78 / 166–170 k, Kanonen-Station 52–68 / 127–134 k, Sternschranke 82 / 144 k (Höchstwert Zeichenaufrufe), Pilz-Röhre
48–58 / 100–118 k, Warp-10-Ankunft 80 / 135 k, Anflug 69 / 163 k. Welt 8 an der Röhre ins Sternenzelt und bei der Rückkehr
höchstens 67 / 159 k (Rückkehr mit Schwenk 85 / 191 k).

---

## Präzisierung (Bausteine Welt 2)

Ergänzung des Bausteine-Agenten (Stand: Wüstenwerkstatt 0-8). Nichts oben Festgelegtes wird geändert. Alle Welt-2-
Bausteine und -Gimmicks sind parametrierbare Module; Level-Bauer setzen sie nur in Daten ein. Jede Datei dokumentiert
ihre Parameter vollständig im Kopfkommentar; hier die Felder mit Beispielen. Aktionen (`onAll`, `onBreak`, `onFall`,
`onTap`, `reward`, `last` …) im bekannten Format `{ reveal, hide, start|path, stop, drop, open, star, spawn, power,
coins, sfx, pos }` (Präzisierung Sonder-Bausteine); Signale an benannte Objekte über `level.named` (Daten-`id`).

### Präzisierung (Bausteine Welt 2): Dateien

```
src/course/blocks/types/w2_space.js     taststein, taststeine, propellerplattform, antipp
src/course/blocks/types/w2_desert.js    fliese, fliesenbruecke, schmale_bruecke, goldroehre, oase, kistenfeld
src/course/blocks/types/w2_hills.js     zahnradplattform, rollwalze, drehrad, farbfeld
src/course/blocks/types/w2_shadow.js    schattenwand, schattenweg, scheinwerfer
src/course/blocks/types/w2_misc.js      Entitäts-Gimmicks auch als segments-type (wie gimmicks.js)
src/course/blocks/types/deco_w2.js      Kulisse Welt 2 (Modelle in statische Geometrie verschmolzen)
src/course/blocks/w2kit.js              MovingBox (bewegter Quader mit mover), circleSlices, modelObject, bakeModel
src/course/entities/kinds/w2_gimmicks.js  kristallwand, antipp_block, antipp_muenze, wachs_block, roter_ring,
                                        rote_muenze, tuer, holz_silhouette, goldschalter, fallmuenze
src/course/entities/tap.js              Antipp-Ziele: Tipp → Strahl von der Kurs-Kamera; Aktionstaste in Reichweite
src/course/view/theme_desert|space|shadow|pinkgrass|lava|house.js, backdrop_w2.js   Themen + Kulissen
src/course/levels/w0/0-8.js             Wüstenwerkstatt (eine Station je Baustein, marks für den Test)
tests/course_w2_blocks.mjs              Port 4340, Bilder tests/out/w2b_*.png (auch je Thema w2b_thema_*.png)
```

Additiv geändert: `view/themes.js` (6 Registrierzeilen, `??=` – nur wenn das Thema noch fehlt), `view/Sky.js` (2 Zeilen:
Haken `theme.buildBackdrop(sky, bounds, rnd, yBase)` und `theme.updateBackdrop(sky, dt, camera)` für eigene Kulissen).
`CourseScene.js` bleibt unverändert (Antippen hängt sich an `level.scene.input`).

### Präzisierung (Bausteine Welt 2): Antippen (Touch) – Schnittstelle

`tapTargets(level)` (= `level.taps`, `entities/tap.js`): Ein kurzer Tipp (≤ 0,45 s, ≤ 14 Logik-Pixel bewegt, nicht auf
A/B/Y/Kamera/Pause) auf die 3D-Leinwand wird zum Strahl von `view.camera`; getroffen wird das nächste freigegebene Ziel
(Hüllquader, Finger-Toleranz 0,55 m bzw. 20 Logik-Pixel um die Zielmitte). Ohne Touch: **Aktionstaste** (Shift/X,
Touch-Y) löst das nächste Ziel in `reach` m aus (vor der Figur bevorzugt). Ausgeführt wird im nächsten Simulationsschritt
(deterministisch). Ziele zeigen ein pulsierendes Tipp-Symbol (ein Punkte-Objekt für alle). Eigene Ziele:
`taps.add({ owner, box: () => ({ min, max }), enabled: () => bool, reach: 4.5, hint: true, onTap(via) })`, via =
`'touch' | 'action'`. Tests: `taps.tapScreen(x, y)` (Logik 480×270), `taps.tapTarget(t)`, `taps.screenPos(t)`, `taps.info()`.

### Präzisierung (Bausteine Welt 2): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `taststein` | Tastenstein (Ø 1,6 m, Oberkante y + 1): Betreten/Antippen → leuchtet, fährt um `rise` hoch, trägt | `pos` (Fußpunkt), `rise` 1, `speed` 2.5, `group`, `note`, `tap` true, `reach` 3, `stay` true / `back` 1.5, `id` | `{ type: 'taststein', pos: [0,1,-10], rise: 2, group: 'g1' }` |
| `taststeine` | Gruppe (Melodie/Treppe), alle gedrückt → `onAll` | `id`, `stones: [{ pos, rise }]`, `order` false (true = Reihenfolge, falscher Stein setzt zurück), `onAll`, `at`, `stay`, `speed` | `{ type: 'taststeine', id: 'treppe', stones: [{ pos: [-6,1,-11], rise: 0.5 }, { pos: [-6,1,-14], rise: 1.5 }], onAll: { star: 0 } }` |
| `propellerplattform` | Schwebeplattform (Oberseite y + thick) | `pos` (Unterseite), `size` [3,3], `thick` 0.4, `mode` 'sink'\|'rise'\|'path'\|'float', `sink` 0.8, `drop` 6, `back` 1.2, `climb` 1.6, `height` 6, `path`, `speed` 2, `wait` 0.8, `loop`, `bob` 0.06, `idle`, `id` | `{ type: 'propellerplattform', pos: [0,3,-40], mode: 'path', path: [[0,3,-40],[0,3,-52]] }` |
| `antipp` | Antipp-Plattform (Touch-Tipp / Aktionstaste) | `pos`, `size` [2.5,0.5,2.5], `mode` 'appear'\|'slide'\|'lift', `dir` [1,0], `length` 3, `speed` 6, `time` 0 (s, 0 = bleibt), `toggle`, `reach` 4.5, `color` 'cyan', `onTap`, `id` | `{ type: 'antipp', pos: [0,0.5,-36], mode: 'appear', time: 6 }` |
| `antipp_block` / `antipp_muenze` | Block zerbricht beim Antippen (Inhalt) / Münze aus der Ferne antippen | `content` 'coin', `look` 'crystal'\|'brick'\|'sand'\|'question', `reach` 4.5 / Münze `reach` 0 | `{ kind: 'antipp_block', pos: [2,1,-30], content: 'coins:3' }` |
| `kristallwand` | zerbrechliche Kristallwand → Geheimnis | `pos`, `size` [3,3,1], `breakable` 'pound' (Stampfen von oben, Kanone, Bombe, Riesentrank) \| 'cannon' (nur Kanone/Bombe/Riesentrank; Stampfen prallt ab), `hits` 1, `climbable`, `color` 'cyan'\|'violet'\|'pink'\|'gold', `onBreak`, `id` | `{ kind: 'kristallwand', pos: [5,1,-74], size: [3,3,1], breakable: 'cannon', onBreak: { reveal: 'truhe' } }` |
| `fliesenbruecke` | Brücke aus Fliesen (Modell 'fliese') | `from`, `to` (Lauffläche), `width` 2, `tile` 2, `gap` 0.3, `thick` 0.4, `mode` 'slide'\|'shift'\|'drop'\|'build'\|'static', `slide: { amp 1.5, period 3, wave 0.7 }`, `shift` 2, `alternate` true, `delay`, `speed` 4, `stay` 2.5, `respawn` 3, `ahead` 2, `trigger` 3, `vanish` 0, `id` | `{ type: 'fliesenbruecke', from: [0,1,-86], to: [0,1,-101], mode: 'slide' }` |
| `fliese` | einzelne Fliese, Modi wie oben | `pos` (Unterseite), `size` [2,2], `axis` [1,0], `yaw` | `{ type: 'fliese', pos: [-6,0.6,-112], mode: 'drop' }` |
| `schmale_bruecke` | 1-m-Steg | `from`, `to`, `width` 1, `style` 'sandstein'\|'holz'\|'stein', `posts` | `{ type: 'schmale_bruecke', from: [0,1,-106], to: [0,1,-118] }` |
| `goldroehre` | goldene Warp-Röhre (wie `pipe`) | `id`, `pos`, `height` 2, `radius` 0.9, `target` (Röhren-Id \| [x,y,z]) | `{ type: 'goldroehre', id: 'g1', pos: [-7,1,-131], target: 'g2' }` |
| `goldschalter` | goldener Druckschalter → Münzregen (`fallmuenze`) | `area: { pos, size: [w,d] } \| { pos, r }` (r 5 um den Schalter), `time` 8, `rate` 7, `height` 9, `life` 7 | `{ kind: 'goldschalter', pos: [80,1,-131], area: { pos: [82,1,-133], size: [8,6] } }` |
| `oase` | Teich mit Sandrand, Palmen, Schilf | `pos` (Mitte, y = Oberkante Rand), `size` [6,5] (Wasser), `depth` 1.6, `rim` 2, `base` 1, `palms` 3 \| [[x,z,h]], `reeds` | `{ type: 'oase', pos: [7,1,-132], size: [5,4], base: 2.4 }` |
| `kistenfeld` | Gitter aus Holzkisten (`crate`) | `pos`, `grid` [c,r] \| [c,r,l], `size` 1, `gap` 0.05, `fill` 'coin', `contents: { 'c,r[,l]': Inhalt }`, `id` (→ `{ crates, left }`) | `{ type: 'kistenfeld', pos: [0,1,-228], grid: [4,3], contents: { '1,1': 'funken' } }` |
| `zahnradplattform` | Zahnrad: `axis` 'y' Drehteller (nimmt mit), 'x'/'z' stehendes Rad (Oberfläche läuft) | `pos` (Mitte), `radius` 2.5, `teeth` 12, `thick` 0.6 (bei x/z = begehbare Breite), `speed` 0.6 rad/s, `idle`, `id` | `{ type: 'zahnradplattform', pos: [6,3.7,-147], axis: 'x', thick: 2.2 }` |
| `rollwalze` | rollender Hügel/Stamm: Laufband-Oberfläche bzw. mit `path` rollendes Hindernis | `pos` (Auflage), `radius` 2, `length` 6, `axis` 'x'\|'z', `speed` 2 m/s (+ = Oberseite nach +Z/+X), `style` 'gras'\|'holz', `path`, `rollSpeed` 3, `loop`, `wait`, `hurt` true, `id` | `{ type: 'rollwalze', pos: [0,1,-158], radius: 2, length: 7, speed: 2 }` |
| `drehrad` | Riesenrad, Stege bleiben waagerecht und tragen | `pos` (Nabe), `radius` 3, `platforms` 4, `plank` [1.6,1.1], `speed` 0.5 (x: oben nach −Z), `axis` 'x'\|'z', `phase`, `idle`, `id` | `{ type: 'drehrad', pos: [6,6.3,-169], radius: 3.4, plank: [2,1.2] }` |
| `farbfeld` | Platten färben sich beim Betreten, alle → `onAll` | `pos`, `grid` [4,4], `cell` 1.8, `gap` 0.1, `tiles`, `toggle`, `colors`, `off`, `onAll`, `at`, `indicator`, `id` | `{ type: 'farbfeld', pos: [0,1,-185], grid: [3,3], onAll: { star: 1 } }` |
| `wachs_block` | wachsender ?-Block: Kopfstoß (oder Stampfen) → wächst um `step`, trägt, Münzen; oben `last` | `pos` (Unterkante, schwebend), `height` 4, `step` 1, `coins` 1, `last` 'coins:5', `pound` true, `speed` 5, `id` | `{ kind: 'wachs_block', pos: [-3,3.3,-198], height: 4, last: 'krallen' }` |
| `roter_ring` / `rote_muenze` | Ring durchlaufen → 8 rote Münzen auf Zeit → Belohnung | `yaw` π/2, `coins` (Liste \| { from, to, n } \| { pos, r, n }), `time` 10, `reward` ({ power: 'oneup' }) \| `star`, `retry` true, `id` | `{ kind: 'roter_ring', pos: [0,1,-208], coins: { pos: [0,1.3,-215], r: 3 }, reward: { star: 2 } }` |
| `tuer` | Tür: öffnet bei Annäherung / per `{ open: id }` / mit `key`; mit `target` Durchgang (Teleport) | `pos` (Schwelle), `yaw` −π/2 (Vorderseite +Z), `width` 1.6, `height` 2.4, `style` 'holz'\|'stein', `locked`, `open`, `auto`, `autoClose`, `target` (Tür-Id \| [x,y,z]), `key` (Id-Liste), `onEnter` | `{ kind: 'tuer', id: 'a', pos: [-4,1,-242], target: 'b' }` |
| `holz_silhouette` | Aufsteller fällt nach hinten um (Tatze, Feuer, Panzer, Bombe, Riesentrank, Stampfwelle, Hineinrennen ≥ 6,5 m/s) | `yaw` −π/2, `onFall`, `push` true, `id` | `{ kind: 'holz_silhouette', pos: [-8,1,-251], onFall: { star: 2 } }` |
| `schattenwand` | Wand mit Schatten aller Objekte der Zone davor (Figur als Scherenschnitt-Puppe) | `pos` (Unterkante Mitte, Vorderseite +Z), `size` [16,8], `depth` 12, `dir` [0.05,0,−1], `light` ([x,y,z] \| scheinwerfer-Id), `color`, `shade`, `frame`, `solid`, `player`/`entities`/`shapes` true, `casters: [{ pos, size, shape: 'box'\|'ball'\|'star'\|'cyl', id }]`, `id` | `{ type: 'schattenwand', id: 'sw', pos: [0,1,-272], size: [20,8], depth: 14 }` |
| `schattenweg` | unsichtbare feste Platten – nur ihr Schatten ist zu sehen | `parts: [{ pos, size }]`, `hint` 0, `hidden`, `id` (reveal/hide) | `{ type: 'schattenweg', parts: [{ pos: [-4,2.3,-264], size: [2.2,0.4,2] }] }` |
| `scheinwerfer` | Bühnenscheinwerfer (Licht für die Schattenwand) | `yaw` π/2 (leuchtet nach −Z), `aim` −0.15, `height` 1.8, `cone`, `length` 6, `on`, `solid`, `id` (toggle) | `{ type: 'scheinwerfer', id: 'lampe', pos: [10,1,-256] }` |
| `deco_w2` | Kulisse (statisch verschmolzen) | `items: [{ kind, pos, … }]`, Arten `kaktus, kakteen, palme, palmen, ruine, ruinen, pyramide, bogen, bluetenbaum, bluetenbaeume, planet, planeten, duenen, felsen, sandflaeche` (Streuungen: `size`, `n`, `gap`, `avoid`, `seed`) | `{ type: 'deco_w2', items: [{ kind: 'kakteen', pos: [-22,-3,-40], size: [10,60], n: 10 }] }` |

Alle Entitäts-Gimmicks (`kind`) sind auch als `type` in `segments` erlaubt. Kollision: bewegte Teile sind Quader mit
`mover` (Figur und Gegner fahren mit), Walzen/Räder sind Scheiben-Quader mit `conveyor` (Laufband-Prinzip), Kristallwand
`breakable` (true bzw. 'cannon' bei `breakable: 'cannon'` – Stampfen prallt dann ab), Schattenweg-Platten `camIgnore`.

**Kanonenkugel (Präzisierung Motor Welt 2):** sie ruft `owner.onHit('cannon', kugel, form)` für jede getroffene Form –
Kristallwand (beide Modi), Antipp-Block und Holz-Silhouette zerbrechen bzw. fallen um (im Test mit dem echten Kanonen-Helm).

**Mehrere Figuren (Spiegelfrucht):** alle Bausteine zählen jede Figur (`level.players`, Helfer `figures(level)` in
`blocks/w2kit.js`, `playerOn`): Tastenstein, Farbfeld (je Figur ein Feld), Propeller-/Fliesen-Plattformen (sinken/kippen,
wenn irgendeine Figur darauf steht), Goldschalter, Tür (Annäherung, Durchgang), rollende Walze (trifft jede Figur),
Aktionstaste (Reichweite irgendeiner Figur), Schattenwand (jede Figur als Scherenschnitt); roter Ring, Holz-Silhouette und
Münzen über die Berührungen je Figur.

**Schattenspiel – Kamera:** in der Schattenzone frontal auf die Wand schauen, z. B. LEVEL.camera-Eintrag
`{ from: z + depth, to: z, pitch: 14, dist: 16, height: 2.6, ahead: 0 }` (steht auch in `level.named.get(id).camera`).
Projektion standardmäßig waagerecht (Schatten zeigen die echten Höhen → Steuern über die 2D-Ansicht).

### Präzisierung (Bausteine Welt 2): Themen

| Thema | Stimmung | Kulisse (`buildBackdrop`) |
| --- | --- | --- |
| `desert` | heißer Mittag, Himmel tiefblau → sandgelb, kräftige Sonne, Sanddunst; Decken = Sand, Körper = roter Sandstein, türkises Wasser; `theme.sand` (Farben für Treibsand/Sandblock) | Dünen und geschichtete Tafelberge (1 Mesh) |
| `space` | fast schwarzer violetter Himmel, kühles Sternenlicht, kein Boden; lavendel Decken, tiefviolette Körper | Sternenfeld, 3 Nebel, 4 Ringplaneten in der Kuppel (3 Meshes, folgen der Kamera) |
| `shadow` | unterirdisch dunkel-warm, Nebel nah, Licht an der Figur, Laternen; Lehmboden | warme Lichtkegel von oben (1 additives Mesh) |
| `pinkgrass` | heller Frühlingshimmel mit rosa Horizont; rosa Grasdecken | rosa Hügel, lila Berge mit Schneekappen (1 Mesh) |
| `lava` | glühend roter Himmel, Rauchdunst; dunkler Fels mit roter Kante | glühender Lavasee tief unten, Vulkankegel (2 Meshes) |
| `house` | Innenraum: kein Himmel, dunkles Violett, warmes Licht, Holzdielen, Licht an der Figur | – |

`grass` bleibt für 2-4. Die Wüstenwerkstatt lässt sich mit `?course=0-8&theme=<name>` in jedem Thema ansehen.

### Präzisierung (Bausteine Welt 2): Welt 2 – Gimmick → Baustein

| Level | Gimmick laut Bauplan | Bausteine |
| --- | --- | --- |
| 2-1 | Wüstenschlucht, Goldröhre oben auf der Wand → Raum mit goldenem Schalter, Oase, Fliesenbrücke, schmale Brücke, verschiebende Brücke zum Ziel | `goldroehre` + `goldschalter`, `oase`, `fliesenbruecke` (`slide`/`shift`), `schmale_bruecke`, `deco_w2` (Kakteen, Palmen, Ruinen, Dünen, Felsen); Treibsand/Sandblöcke vom Motor (`quicksand`, `sandblock`) |
| 2-2 | Taststeine (heben sich), Antipp-Plattformen, Kristallwand, steigende/pendelnde Propellerplattformen, Kristallplattformen | `taststein(e)`, `antipp`, `antipp_block`, `kristallwand`, `propellerplattform` (`rise`/`path`) |
| 2-3 | Schattenspiel: Schatten zeigt Stern/versteckten Weg, Türen, Holz-Silhouette des Endgegners | `schattenwand` (+ `casters`), `scheinwerfer`, `schattenweg`, `tuer` (`target`), `holz_silhouette` (`onFall`), Krümel = Modell `kruemel` |
| 2-4 | rollende Hügelwalzen, roter Ring, Zahnrad-Drehplattformen, rotierende Räder, Farbfeld-Raum | `rollwalze`, `roter_ring`, `zahnradplattform`, `drehrad`, `farbfeld` |
| 2-5 | Kistenfeld, wachsender ?-Block, roter Ring | `kistenfeld`, `wachs_block`, `roter_ring` |
| 2-Panzer | roter Ring auf dem Panzer | `roter_ring` (auf fahrenden Panzern muss der Autoscroller-Archetyp Ring/Münzen mitführen) |
| 2-Haus | 5 Räume à 10 s mit Türen | Thema `house`, `tuer` |

Gemessen in der Wüstenwerkstatt (scale 2, Kurs-Kamera): 75–119 Zeichenaufrufe inkl. Schattenpass, 220–361 k Dreiecke;
Themen-Bilder (flachere Kamera, Pitch ≤ 24°) 88–133 Aufrufe. Einzelkosten: Schattenwand 1 Fläche + ≤ 4 Instanz-Meshes,
Fliesenbrücke/Farbfeld/rote Münzen je 1–2 Instanz-Meshes, Kulisse `deco_w2` 0 (verschmolzen).

---

## Präzisierung (Autoscroller/Haus)

Ergänzung des Gameplay-Agenten (Stand: Testlevel 0-4 „Rollband“ und 0-5 „Prüfstube“). Nichts oben Festgelegtes wird
geändert. Beide Archetypen sind datengetrieben und für Welt 2 und spätere Welten gedacht (Autoscroller: 2-Panzer,
3-2, 3-Zug, 5-Zug, 6-Panzer, 8-Zug; Prüfungs-Haus: 2-Haus, 4-Haus, 6-Haus, 8-Haus, K-Haus).

### Präzisierung (Autoscroller/Haus): Dateien

```
src/course/archetypes/ScrollWindow.js       Bildfenster (reine Mathematik, Node-tauglich): ScrollPath, ScrollWindow, parseScroll
src/course/archetypes/kinds/autoscroller.js Archetyp 'autoscroller' (Fenster, Grenzen, Kamera, Ende, Neustart, Kombination `with`)
src/course/archetypes/kinds/house.js        Archetyp 'house' (Räume, Raum-Timer, Sterne, Überblendung, Zeitablauf, Ergebnis)
src/course/entities/kinds/vehicle.js        Entität 'vehicle' (Panzer, Plattformwagen, Waggon, Flachwagen, Kettenzaun) + attach
src/course/blocks/types/vehicle.js          dieselbe als Baustein ({ type: 'vehicle' } in segments)
src/course/blocks/types/track.js            Baustein 'track' (Gleis mit Schwellen, Gerüst-Brücke, Prellbock)
src/course/levels/w0/0-4.js, 0-5.js         Testlevel „Rollband“ (Autoscroller) und „Prüfstube“ (Haus)
tests/course_archetypes2.mjs                Port 4209, Bilder tests/out/ca2_*.png
```

Kleine Ergänzungen: `CourseUIScene.js` (Haus: großer Raum-Timer oben rechts statt der Level-Uhr, darunter „Raum n/N“,
letzte 3 s rot und pulsierend, geschafft grün; Überblendung als Vollbild-Abdunklung; ab 11 Sternen
kompakte Anzeige „★ n/N“), `CourseResultScene.js` (Haus: Zeile „Prüfungs-Haus: n von N Sternen“, Überschrift „Haus
verlassen“ bei Teilergebnis; ab 9 Sternen kompakt), `entities/kinds/items.js` (`coins` reicht `roomId` und `attach` an
jede Münze weiter).

### Präzisierung (Autoscroller/Haus): Archetyp `autoscroller`

Ein **Bildfenster** fährt mit konstantem (abschnittsweise wechselndem) Tempo entlang eines Pfads; die Kamera folgt dem
Fenster, nicht der Figur. Die Figur bewegt sich frei im Fenster; an der **vorderen** Grenze wird sie sanft gebremst
(in den letzten `soft` m höchstens Fenstertempo + 4 m/s je m Abstand, an der Grenze hart), an der **hinteren** Grenze
**mitgeschoben** (Bewegung mit Kollision). Kommt sie dabei nicht weiter (Hindernis davor), wird sie nach `crush` m
**zerquetscht** (`player.die('crush')`). Am `end` hält das Fenster (weich abgebremst, genau auf `end`), die Grenzen
fallen weg, die Kamera gleitet in 1,1 s zur normalen Verfolgung, die Figur läuft frei weiter (z. B. zur Röhre).

```js
archetype: 'autoscroller',
scroll: {
  path: [[0, 0, 10], [0, 0, -150]],   // Fensterlinie (Mitte des Fensters); y = Fahrebene der Fahrzeuge (Schienenoberkante)
  // oder: axis: '-z', line: [x, y], start/end/speeds.from als Koordinate auf der Achse (z. B. start: 0, end: -120)
  start: 11, end: 121,                // Pfadlänge (m) der Fenstermitte am Anfang/Ende (Standard 0 / Pfadlänge)
  speed: 4, speeds: [{ from: 40, speed: 3.4 }],   // m/s; ab Pfadlänge `from` gilt `speed`
  accel: 6,                           // m/s² Anfahren/Tempowechsel
  delay: 2,                           // s nach Levelstart (bzw. nach dem Auslöser) bis zur Abfahrt
  trigger: { min: [x, y, z], max: [x, y, z] },   // optional: Abfahrt erst, wenn die Figur hineingeht
  frame: { back: 5, front: 8, side: null, soft: 1.5, crush: 0.35, backMode: 'push' /* | 'kill' */,
           ahead: 0, followX: 0.3, followY: 1, turn: true },
  with: 'boss',                       // optional: zweiter Archetyp (z. B. Bossarena nach der Fahrt, 2-Panzer)
  startBanner: "Los geht's!", endBanner: 'Endstation!',   // Ansagen ('' = keine)
},
camera: [{ from: 14, to: -150, pitch: 41, dist: 15, yaw: 0, fov: 40 }],   // ausgewertet an der Fenstermitte
```

- `frame`: Grenzen in m hinter/vor der Fenstermitte, `side` seitlich ± (null = frei). `backMode: 'kill'` für senkrechte
  Fahrten (6-7: unten aus dem Bild = Tod). Kamera: Blickziel = Fenstermitte (+ `ahead` m), seitlich `followX`,
  senkrecht `followY` (1 = Standhöhe der Figur wie üblich); `turn` dreht die Kamera mit der Fahrtrichtung (Kurven),
  `LEVEL.camera`-yaw kommt hinzu. Die Steuerungs-Gier kommt aus derselben Rechnung (deterministisch).
- **Bildausschnitt passend wählen:** mit `pitch 41, dist 15, fov 40` liegt `back 5` am unteren Bildrand und
  `front 8` gut unter der HUD-Leiste – steilere/nähere Kameras brauchen kleinere Werte. `back + front` höchstens 13 m
  (sonst können weit auseinander stehende Spiegelfrucht-Klone als „verloren“ gelten, `Squad.LOST_BEHIND`).
- **Spiegelfrucht (Präzisierung Motor Welt 2):** Grenzen, Schieben, Einklemmen und das geerbte Fahrzeugtempo gelten
  für **jede** Figur in `level.players`. Ein eingeklemmter bzw. unten hinausgefallener Klon verschwindet (über
  `player.die` → `level.removeFigure(fig, 'crush' | 'fall')`, kein Leben weg); erst die letzte Figur stirbt normal.
  Fahrzeuge tragen alle Figuren (Kollisionswelt). Kamera und Steuerungs-Gier bleiben am Fenster.
- **Springen auf fahrenden Fahrzeugen:** In der Luft rechnet der Archetyp die Bewegung relativ zum geerbten
  Fahrzeugtempo (Luftsteuerung und Luftwiderstand der Figur wirken relativ zum Wagen; seitlich mit Kollision
  mitgenommen). Ein Sprung auf der Stelle landet wieder an derselben Stelle des Wagens.
- **Neustart:** Ein Checkpoint (auch eine Fahne auf einem Fahrzeug, `attach`) speichert die Fensterlage; nach einem Tod
  geht es dort mit derselben Fensterlage weiter (Fahrzeuge springen zurück, ihre Lage ist eine reine Funktion der
  Fahrt-Uhr). Ohne Checkpoint: Fahrt von vorn. Checkpoints müssen beim Berühren im Fenster liegen.
- **Kombination:** `with: '<archetyp>'` erzeugt einen zweiten Archetyp, dessen Haken (`setup`, `beforeStep`,
  `afterStep`, `render`, `createRig`, `createPlayer`, `info`, `dispose`) mitlaufen; seine Kamera übernimmt nach dem
  Ende der Fahrt. Beide umhüllen `runtime.respawn` (verkettet).
- `level.scroll` = ScrollWindow: `state` (`wait` | `run` | `done`), `s`, `speed`, `clock` (s seit Abfahrt, läuft nach dem
  Ende weiter), `center`, `dir`, `side`, `path` (ScrollPath: `at(s)`, `dirAt(s)`, `headingYaw(s)`), `local(p)` →
  `{ along, across, up }`, `snapshot()`/`restore(snap)`. `info()` des Archetyps: `{ state, s, speed, clock, center,
  dir, ended, camK, player: { along, across }, pushes, crushed, inherit, frame, sub, hud }`.
- Effekte: `switch` beim Halt; Tod durch Einklemmen `die('crush')` (Todesanimation wie bei Treffern).

### Präzisierung (Autoscroller/Haus): Fahrzeug `vehicle` und Unterobjekte (`attach`)

```js
// als Baustein (segments) oder Entität (enemies/items): { type|kind: 'vehicle', … }
{ type: 'vehicle', id: 'wagen2', style: 'cart',   // cart (Plattformwagen) | tank (Panzer) | wagon (Güterwagen, Dach
                                                   //  begehbar) | flat (Flachwagen) | fence (Kettenzaun-Plattform) | plain
  size: [4, 1.2, 9],          // Breite, Deckhöhe über der Fahrebene, Länge (Standard je Stil)
  at: 30.8,                   // Pfadlänge der Fahrzeugmitte bei Fahrtbeginn (Standardpfad: der des Fensters)
  speed: 2.5,                 // m/s eigenes Tempo (negativ = rückwärts) | 'scroll' (genau mit dem Fenster; Standard im
                              //  Autoscroller) – ohne Autoscroller Standard 0
  delay: 1, stop: 102.8, brake: 3,   // Abfahrt s nach Fahrtbeginn; Halt bei Pfadlänge (weich gebremst, m/s²)
  offset: [dx, dy],           // seitlich (rechts +) und Höhe zur Pfadlinie
  path: [[x,y,z], …], mode: 'once' | 'loop' | 'pingpong',   // eigener Pfad (Kettenzäune am Himmel, Gegenverkehr)
  pos: [x,y,z], dir: [dx, dz],                             // ohne Pfad und ohne Autoscroller: gerade Strecke
  reverse: false, color, accent, deck: true,
  model: 'panzer_fahrzeug', modelOpts: {},   // Modell aus der Registry (Blick +X, state { speed }); Stil 'tank' nutzt
                                             //  standardmäßig panzer_fahrzeug (size → length/width/deck, color 'rot'|'oliv')
  parts: [{ pos: [x, y, z], size: [w, h, d], color, climbable, oneWay, solid, kill, visible, tag }],
}
// Unterobjekte: jede Entität mit attach fährt mit (Lage, Gier, Kollisionsformen; ihre Formen tragen dann ebenfalls)
{ kind: 'bomb_cannon', attach: 'wagen2', pos: [1, 1.2, -18.2] },
{ kind: 'coins', attach: 'wagen1', from, to, n },  checkpoint: { pos, attach: 'wagen2' },  stars: [{ pos, attach }]
```

- Fahrzeug-Koordinaten der `parts`: x rechts, y oben ab Fahrebene, z nach hinten (+), `pos` = Mitte der Unterseite.
  Alle Teile sind Kollisionsquader mit gemeinsamem `mover` (`camIgnore`); Figur und Gegner werden mitgenommen
  (Drehung in Kurven über `mover.dyaw`). In Kurven bleiben die Quader achsenparallel (Hüllquader) – Fahrzeuge fahren
  am besten gerade oder im 90°-Raster.
- Die Lage eines Fahrzeugs ist eine reine Funktion der Fahrt-Uhr bzw. der Fensterlage (`speed: 'scroll'`) – Neustarts
  setzen sie zurück. Bewegung in `level.onStep` (vor der Figur). Gegner mit `attach`, die auf dem Fahrzeug stehen,
  nimmt ihr eigenes `moveWithGravity` mit; in der Luft hält `attach` sie beim Fahrzeug. Gegner-`path` ist in
  Weltkoordinaten – auf Fahrzeugen ohne `path` laufen lassen (Kantenumkehr).
- `level.named.get(id)` = Fahrzeug mit `s`, `speedNow`, `mover`, `attached` (Set), `info()`.

`track` (Optik, statisch): `{ type: 'track', path | from/to, gauge: 2.4, sleepers: 0.9, trestle: { bottom: -36, every: 8,
width } | false, buffer: 'end' | 'start' | 'both', solid: false, from/upto (Pfadbereich), color }`.

### Präzisierung (Autoscroller/Haus): Archetyp `house` (Prüfungs-Haus)

```js
archetype: 'house',
house: {
  fail: 'exit',               // Zeit abgelaufen: Haus verlassen (Standard, wie im Vorbild) | 'retry' (Raum von vorn)
  time: 10, cheer: 1.5, fade: 0.35,   // Standard-Raumzeit, Jubel (s), Überblendung je Richtung (s)
  rooms: [
    { id: 'r1', goal: 'defeatAll', area: { min: [-7, -1, -7], max: [7, 9, 7] },   // oder [x0, z0, x1, z1]
      start: { pos: [0, 1, 4.5], yaw: Math.PI / 2 }, star: [0, 2.6, -1.5], time: 10,
      camera: { pitch: 52, dist: 16, fov: 40, center: [0, 1, -0.5], pull: 0.65 }, title: 'Besiege alle Gegner!' },
    { id: 'r2', goal: 'collect', count: 8, … },   // Gegenstände mit roomId: 'r2' (z. B. { kind: 'coins', roomId: 'r2', … })
    { id: 'r3', goal: 'reach', star: [80, 4.3, -4], … },   // Stern von Anfang an sichtbar; berühren = geschafft
  ],
},
enemies: [{ kind: 'pilzling', roomId: 'r1', pos: [-3, 1, -2.5], behavior: 'chase' }],   // ohne roomId: Fußpunkt in area
```

- Ablauf je Raum: Überblendung herein (Figur eingefroren) → Countdown (großer Timer im HUD, `sfx('house_tick')` bei 3,
  2 und 1 s) → Ziel erfüllt: Timer steht, `sfx('room_clear')`, der Stern erscheint am `star`-Punkt und fliegt zur Figur
  (zählt, Index = Raumnummer; `grab: true` = er muss noch berührt werden, Zeit läuft weiter), Siegespose, Jubel →
  Überblendung in den nächsten Raum. Nach dem letzten Raum Ergebnis.
- Zeit abgelaufen: Ansage, `sfx('timewarn')`; `fail: 'exit'` → `runtime.finish()` mit den bisherigen Sternen
  (gespeichert, Level gilt als gespielt), Ergebnis „Haus verlassen“ / „Prüfungs-Haus: n von N Sternen“.
  `fail: 'retry'` → derselbe Raum von vorn. Tod in einem Raum: Leben −1, Raum von vorn (Gegner/Gegenstände frisch);
  war der Raum schon geschafft (Tod im Jubel), zählt sein Stern und es geht im nächsten Raum weiter.
- Spiegelfrucht-Klone reisen mit: beim Raumwechsel stehen sie im Kreis um die Heldin am Raumstart (`squad.gather`),
  Überblendung/Jubel/Zeitablauf frieren alle Figuren ein (Siegespose je Figur nach der Landung). Ein getroffener Klon
  verschwindet wie gewohnt; nach einem Tod (Leben −1) gibt es keine Klone mehr (`LevelRuntime.respawn`).
- Ziele: `defeatAll` über `level.onEnemyDefeated` (verkettet; heruntergefallene Gegner zählen auch), `collect` über
  Entitäten mit `spec.roomId` (alle bzw. `count`), `reach` über den Stern. Kamera je Raum: Abschnitt der Kameraschiene
  im X-Bereich von `area` (Räume nebeneinander entlang X legen, ≥ 20 m Abstand); `center` + `pull` ziehen den Blick
  zur Raummitte. Das Gesamtzeit-Limit des Levels ruht. Sterne: N = Zahl der Räume (LevelRuntime bekommt N Plätze).
- HUD-Zustand `level.house = { room, rooms, time, limit, phase, fade, cleared, stars }` (CourseUIScene liest ihn);
  `phase` ∈ `fadein | play | clear | timeout | fadeout | final | exit`. `info()`: `{ room, rooms, id, goal, phase,
  time, fade, left, cleared, stars, timeouts, resets, ticks, exited, done, flying, hud }`.

### Präzisierung (Autoscroller/Haus): Tests

`tests/course_archetypes2.mjs` (Port 4209): Bildfenster in Node (Achsen-Form, speeds, Halt genau bei `end`,
Auslöser, snapshot/restore, Kurve), Autoscroller 0-4 (vorne gebremst, delay, Tempo, Kamera am Fenster und nicht an
der Figur, Wagen tragen Figur/Kanone/Pilzling, Sprung auf der Stelle und über die Lücke, hinten geschoben,
Einklemmen = Tod, Neustart von vorn bzw. am Wagen-Checkpoint, Klon geschoben und eingeklemmt entfernt, speeds, Halt
von Fenster und Wagen, freie Bewegung danach, Kamera zurück, Röhre → Zielmast, Panzer mit Modell panzer_fahrzeug fährt
mit dem Fenster und trägt) und Haus 0-5 (Überblendung, Countdown, HUD, Ziele defeatAll/collect/reach, Stern-Flug,
Raumwechsel, Raumkamera, Ticks, Zeitablauf → Teilergebnis gespeichert, Ergebnis-Szene, Tod → Raum neu, Tod im Jubel
→ nächster Raum, Klon reist mit, `retry`, 3/3) – 70 Prüfungen.
Gemessen (scale 2): 0-4 67–84 (mit Panzer), 0-5 15–42 Zeichenaufrufe inkl. Schattenpass, höchstens 122 k Dreiecke.

---

## Präzisierung (Motor Welt 2)

Ergänzung des Motor-Agenten (Stand: Testlevel `0-3` „Klonwiese“). Nichts oben Festgelegtes wird geändert; hier steht,
was Welt 2 (und Welt 3) an der Spielfigur brauchen: Spiegelfrucht mit mehreren Figuren, Mehrfigur-Bausteine, Trage-Helme,
Topfpflanze, Treibsand und Sandblöcke. Level-Bauer schreiben nur Daten; Gegner-/Baustein-Agenten nutzen die API unten.

### Präzisierung (Motor Welt 2): Dateien

```
src/course/player/Squad.js               Figurengruppe: Klone erzeugen/entfernen („Poff“), Haupt-Figur wechseln, Mitreisen
                                         (Röhre/Glasröhre), Jubeln am Ziel, weiches Abstoßen, „verloren“-Grenze, Klon-Darstellung
src/course/player/helmets.js             Trage-Helme kanone | propeller | licht (Wirkung, fireCannon, shineLight, Rückfall-Modelle)
src/course/player/Player.js              + Klon-Regeln (hurt/die/collectPowerup), Helm-API, Aktion (doAction), Treibsand
src/course/player/HeroRig.js             + Option lite (Klone), Helm am Kopfanker, Lichtkegel, player.hidden
src/course/level/Level.js                + players, nearestPlayer, focus, addClone, removeFigure, setMainFigure; Schritt je Figur
src/course/view/CameraRig.js             + Rahmung mehrerer Figuren (Schwerpunkt, groupZoom)
src/course/CourseUIScene.js              + Figuren-Leiste ×N und Helm-Symbol (abgegrenzter Block createSquadHud/refreshSquadHud)
src/course/entities/kinds/figuren.js     pfeld, figurenschalter (+ Badge = Anzeige-Schild, figuresOn)
src/course/entities/kinds/helme.js       helm_kanone, helm_propeller, helm_licht, kanonenkugel, testgeist
src/course/entities/kinds/topfpflanze.js, holzwand.js, sandblock.js
src/course/blocks/types/quicksand.js     Treibsand (Becken, fließend)
src/course/blocks/types/multilift.js     Viererlift
src/course/blocks/types/w2engine.js      alle Entitäten oben auch als `type` in segments; sandblock als Reihe/Feld
src/course/levels/w0/0-3.js              Testlevel „Klonwiese“ (Stationen mit Schildern und marks)
tests/course_w2engine.mjs                Port 4199, Bilder tests/out/w2e_*.png, Kennzahlen mit 1 und 5 Figuren
```

Kleine Ergänzungen außerhalb: `entities/Enemy.js` und Gegner (je eine Zeile `nearestPlayer`), `entities/gimmick.js`
(`playerOn`/`playerDist` für alle Figuren), `entities/visuals.js` (Rückfall-Optik `powerup_spiegel`), `player/powers.js`
(Alias `spiegel`), `level/LevelRuntime.js` (Neustart ohne Klone).

### Präzisierung (Motor Welt 2): mehrere Spielfiguren (Spiegelfrucht)

**Spiegelfrucht** (Power-up `spiegel`, Aliasse `spiegelfrucht`, `klon`; Bauplan „Doppelkirsche“): Einsammeln erzeugt neben
der Figur einen Klon derselben Heldin (gleiche Größe, gleiches Power-up samt Restzeit), höchstens **5 Figuren**. In Daten
wie jedes Power-up: `{ kind: 'powerup', pos, power: 'spiegel' }`, `blocks[].content: 'spiegel'`, `drop: 'spiegel'`,
Aktion `{ power: 'spiegel' }`. Modell `powerup_spiegel` (Rückfall: zwei glänzende Früchte, `entities/visuals.js`).

| Regel | Umsetzung |
| --- | --- |
| Eingabe | Alle Figuren bekommen **dieselbe** Eingabe (Stick, Sprung, Ducken, Aktion); jede rechnet ihre Physik selbst. Nach dem Zielmast stehen die Klone (neutrale Eingabe) und jubeln (`victory`). |
| Abstoßen | Überlappende Figuren schieben sich weich auseinander (30 % der Überlappung je Schritt, ≤ 5 cm, mit Weltkollision) – kein hartes Blockieren, kein Stapeln. |
| Treffer / Absturz / Treibsand | Mit > 1 Figur verschwindet nur die betroffene Figur („Poff“, `squad.log`), kein Leben weg. Die letzte Figur: normaler Treffer/Tod. **Zeit um** → alle (normaler Tod). Ein Trage-Helm fängt den Treffer zuerst ab. |
| Power-ups | `collectPowerup` wirkt auf alle Figuren; Sammelobjekte (Münzen, Sterne, Stempel) zählen einmal (verschwinden beim ersten Kontakt). |
| Berührungen | `onPlayer`, Angriffe (`attackInfo`), Auslöser (`checkTriggers`), Checkpoint, Zielmast, Druckfelder … laufen **je Figur**. |
| Haupt-Figur | `level.players[0]` = `level.player` = Kamera-Anker, HUD, `scene.player`/`scene.rig`. Fällt sie weg, übernimmt die älteste verbleibende Figur (volle Darstellung). Röhre, Glasröhre/Kanone (`player.ride`), Reittier und Zielmast machen die auslösende Figur zur Haupt-Figur (`level.setMainFigure`). |
| Mitreisen | Haupt-Figur in Röhre/gesteuertem Ablauf → die anderen reisen unsichtbar mit (`script.type 'follow'`, `player.hidden`) und erscheinen danach im Kreis um sie. |
| Verloren | Liegt eine Figur > 13 m (in Kamerablickrichtung) hinter der vordersten, > 11 m seitlich vom Schwerpunkt oder > 9 m unter der höchsten stehenden Figur – jeweils 0,5 s lang –, geht sie mit „Poff“ verloren (Klone zuerst). |
| Kamera | Folgt dem Schwerpunkt aller aktiven Figuren (senkrecht an der Haupt-Figur verankert), zoomt mit der Streuung weich heraus (ab 1,5 m, bis ×1,35 bei 10,5 m; `rig.info().group/spread`). Die Steuerungs-Gier kommt aus dem Schwerpunkt. |
| HUD | Unter dem Leben-Panel eine rosa Leiste mit je einem Köpfchen pro Figur und „×N“, sobald es mehr als eine Figur gibt; darunter das Helm-Symbol der Haupt-Figur. |
| Darstellung | Eigener `HeroRig` je Figur (gleiche Heldin); Klone mit `lite` (kein Sonnen-Schattenwurf, der Blob bleibt; Lotti-Zöpfe nur mit dem oberen Glied; ohne Augen-Glanzpunkte), wachsen beim Entstehen aus 12 % auf volle Größe und glitzern 0,9 s. |

API (`level`): `players`, `player` (Getter = `players[0]`; Setzen macht die Figur zur Haupt-Figur), `nearestPlayer(pos)` (nächste
lebende, steuerbare Figur; ohne Klone `level.player`), `focus(out)` (Schwerpunkt), `addClone(src)` → Figur | null,
`removeFigure(fig, cause)` (`'hit' | 'fall' | 'sand' | 'lost' | 'clear'`; die letzte nie), `setMainFigure(fig)`, `squad`
(`player/Squad.js`; `null` außerhalb von `CourseScene`, z. B. Weltkarte), `contacts(input, p)`, `attacks(p)`.
Figur (`Player`): `clone`, `cloneId`, `hidden`, `removedFigure` (Grund), `startFollow(leader)`, `cheer()`.
`CourseScene`: `squad`, `addClone()`, `figures()`, `setHero(k)` wechselt **alle** Figuren (auch über Pause → „Figur“), `teleport`
sammelt die Klone um die Haupt-Figur, `state().figures` = Anzahl. Konstanten in `Squad.js`: `MAX_FIGURES 5`, `LOST_BEHIND 13`,
`LOST_SIDE 11`, `LOST_DROP 9`, `LOST_TIME 0.5`.

**Gegner-KI:** neue Gegner zielen mit `this.level.nearestPlayer(this.pos)` statt `this.level.player`. `Enemy` nutzt das in
`player`, `playerActive()`, `playerDist()`, `canSee()`, `toPlayer()`, `poundLandedNear()`; umgestellt (je eine Zeile) sind außerdem
brummer, krallen_pilzling, pilzlingsturm, rammbock_bulle, stampfstein, zauberkroete/zauberkugel, schnappblume, bomb_cannon
(`aim: 'player'`), baron, kickbombe (Explosion trifft die nächste Figur). Gimmick-Hilfe `playerOn(level, owner)` zählt jede Figur, `playerDist` die nächste. Was weiter nur
`level.player` liest, sieht nur die Haupt-Figur (Feuerspur des Barons, Warp-Box, Zeitanzeige über der Figur, Archetypen).

**Kosten (gemessen, scale 2, `tests/course_w2engine.mjs`):** Heldin als Haupt-Figur ≈ 34 Zeichenaufrufe inkl. Schattenpass
(21 sichtbare Meshes, davon 14 mit Schattenwurf; der geschlossene Mund wird jetzt ausgeblendet). Ein Klon mit `lite` ≈ 15
(kein Schattenwurf, Zöpfe nur oberes Glied, ohne Augen-Glanzpunkte). Klonwiese am Start: 1 Figur 77, 5 Figuren 137
Zeichenaufrufe (Ziel < 140), je Klon ≈ 15;
dichte Stellen (Viererlift-Turm mit 4 Figuren oben, weite Sicht) ≈ 150–155; 99–169 k Dreiecke. Vorher (ohne Sparmaßnahmen) kostete
jede Figur ≈ 35 → 5 Figuren ≈ 175 + Level.

### Präzisierung (Motor Welt 2): Mehrfigur-Bausteine (Daten)

Ereignisse im Aktionsformat der Sonder-Bausteine (`{ reveal, hide, start|path, stop, drop, star, spawn, power, coins, sfx }`,
auch als Liste). Alle drei funktionieren auch mit einer Figur (need 1) und sind in `items`/`blocks` (`kind`) und in `segments`
(`type`) erlaubt.

| Art | Kern | Parameter | Beispiel |
| --- | --- | --- | --- |
| `pfeld` | Druckfeld: löst aus, wenn `need` Figuren gleichzeitig darauf stehen; Felder mit gleicher `group` müssen gleichzeitig belegt sein (je Feld `need`, Standard 1; `on` an einem Feld). Modell `pfeld` (rund, Ø = kleinere Seite von `size`, Oberseite 0,26 m, gedrückt 0,2 m; Ziffer `need`, Lämpchen `count`, ausgelöst gold) – Kollision dann ein Zylinder; Gruppen zeigen zusätzlich das Schild „1/2“ (belegte Felder). Rückfall: eckige Platte mit Schild „1/2“ | `pos` (Mitte Unterseite), `size: [w, d]` (2 × 2), `need` (2), `group`, `on`, `once` (true; false = Halten mit `on`/`off`), `off`, `color`, `id`, `hidden` | `{ kind: 'pfeld', pos: [0,1,-20], need: 2, on: { reveal: 'weg1' } }` · Paar: `{ kind: 'pfeld', pos: [-3,1,-30], group: 'paar', on: { star: 1 } }` + `{ kind: 'pfeld', pos: [3,1,-30], group: 'paar' }` |
| `multilift` | Lift fährt nur, solange ≥ `need` Figuren darauf stehen; zu wenige → hält, nach `wait` s zurück zum Start; oben wartet er, bis alle weg sind. Trägt mit (mover). Modell `multilift` (Oberseite 0,4 m, Tafel mit Ziffer `need` und Lämpchen `count` hinten, `go` beim Fahren); Rückfall: Plattform mit Schild „2/4“ vorn | `pos` + `rise` (6) oder `path`, `size` ([3, 0.5, 3]), `need` (4), `speed` (2.5), `back` (true), `wait` (1.0), `color`, `id` → `named { count, need, s, length, state }` | `{ type: 'multilift', pos: [0,1,-60], rise: 7, need: 4 }` |
| `figurenschalter` | Runder Schalter mit Porträt; nur die Heldin `hero` löst aus (draufstellen), die andere bekommt „Nur für Lotti!“ + Wackeln. Heldin wechseln: Pause-Menü „Figur“ (wirkt auf alle Figuren im Level). Modell `figurenschalter` 0,2 m in den Boden gesenkt (Knopf 0,26 m über `pos`, begehbar; gedrückt −0,11 m) | `pos`, `hero: 'lotti' \| 'greta'`, `on`, `once` (true), `yaw` (Porträt), `id`, `hidden` | `{ kind: 'figurenschalter', pos: [6,1,-12], hero: 'greta', on: { reveal: 'stempelweg' } }` |

Ausrichtung: Die Registry-Modelle zeigen Ziffern/Porträts mit der Oberkante nach −X; der Motor dreht sie um −90°
(Oberkante nach −Z), damit sie aus der Standardkamera aufrecht stehen (Tafel des Viererlifts hinten).
Hilfen für eigene Bausteine (`entities/kinds/figuren.js`): `figuresOn(level, owner, filter?)` = Zahl der Figuren, die auf
einer Form mit diesem `owner` stehen; `new Badge(level, { w, h, color })` → `show(text, color, sub?)`, `at(x, y, z)`, `hide()`
(Text passt sich der Breite an).

### Präzisierung (Motor Welt 2): Trage-Helme

Entitäten `helm_kanone`, `helm_propeller`, `helm_licht` (`{ kind, pos, respawn?: s (0 = nie; sonst liegt nach dem Aufheben/
Verlust wieder einer am Ort), id?, hidden? }`). **Berühren setzt den Helm auf** – unabhängig vom Power-up, je Figur höchstens
einer. **Ab:** Treffer (der Helm **fängt den Treffer ab**: Figur bleibt heil und 1,5 s unverwundbar, der Helm fliegt im Bogen davon
und ist wieder aufhebbar) oder **Ducken + Aktion** (vor sich absetzen). Tod/Absturz/Klon weg: Helm weg.
Aktion-Reihenfolge (`player.doAction`): Getragenes werfen → Helm absetzen (Ducken) bzw. Helm-Aktion → Aufheben → Power-up-Aktion.

| Helm | Wirkung | Werte | Modell-Zustand |
| --- | --- | --- | --- |
| `kanone` | feuert automatisch alle 0,6 s und sofort mit Aktion (≥ 0,2 s Abstand) eine `kanonenkugel` in Blickrichtung aus Kopfhöhe | 11 m/s geradeaus ohne Schwerkraft, 1,6 s (≈ 17 m), ≤ 3 je Figur | `helm_kanone { anim: 'idle' \| 'fire', progress }` |
| `propeller` | Aktion → steiler Aufstieg (einmal je Bodenkontakt), danach mit gehaltener Aktion/Rennen (Shift, Y-Knopf) oder Sprung langsames Sinken, volle Luftsteuerung | Aufstieg ≈ 8 m (gemessen 7,9 m), Sinken ≤ 2,6 m/s | `helm_propeller { anim: 'idle' \| 'fly' (Aufstieg) \| 'spin' (Sinken), spin }` |
| `licht` | Lichtkegel nach vorn; jede Entität mit **`onLight(dt, player)`** im Kegel bekommt den Aufruf je Schritt (feste Wände schatten ab) | 7 m, ±30°, 12° abwärts | `helm_licht { on: true }`; HeroRig zeichnet zusätzlich den langen Kegel (7 m) |

Figur: `player.helmet` (`'kanone' | 'propeller' | 'licht' | null`), `helmetDef`, `helmetFx` (Zustand des Helms), `helmetCooldown`,
`wearHelmet(name)`, `dropHelmet('off' | 'hit' | 'gone', source?)`. Registry `player/helmets.js` (`HELMETS`, `getHelmet`,
`normalizeHelmet`, `helmetModel`, `fireCannon(player)`, `shineLight(player, dt)`); `def`: `label, icon, model, onWear, onRemove,
update(player, dt, input), onAction(player, input) → true, state(player)`. Darstellung: `HeroRig` hängt `helmetModel(name)`
(Registry `helm_kanone|helm_propeller|helm_licht`, sonst Rückfall) an den Kopf des Avatars (`avatar.head`, 0,44 Einheiten über dem
Halsgelenk, Maßstab 1,35 = Meter → Avatar-Einheiten × 0,9; ohne Kopf-Objekt an der Hülle in Kopfhöhe) – `src/three/avatars` bleibt
unverändert. Modelle (`models/kinds/items_w2.js`): Meter, Ursprung = Mitte der Unterseite, Blick nach +X, Kasten ≈ 0,5 m.

**Kanonenkugel** (`kanonenkugel`, `{ pos, dir: [dx, dz], owner, speed?, life? }`): trifft sie einen Gegner → `onHit('cannon', kugel)`
(Standard-`Enemy`: wegfliegen; eigene Wirkung über `onHit('cannon')` oder `onCannon(kugel)`); trifft sie eine Wand: Formen mit
**`breakable: 'cannon'`** → `owner.onHit('cannon', kugel, form)`; `breakable: true` (Holzkiste, Ziegel) → `onHit('cannon')` und, steht
die Form danach noch, `onHit('shell')` (wirkt wie ein Panzer); jeder andere getroffene Formbesitzer mit `onHit` bekommt ebenfalls
`onHit('cannon', kugel, form)` (Kristall-/Holz-Bausteine entscheiden selbst); danach zerplatzt sie. `Player.land` stampft
`breakable: 'cannon'` (wie `'bomb'`) nicht durch. Modell `kanonenkugel` (Ø 0,5 m → auf Ø 0,44 m skaliert, `{ anim: 'fly', speed }`).

**Holzwand** (`holzwand`, auch `type`): `{ pos, size: [w, h, d] ([3, 3, 0.5]), content?, face?: true (grimmiges Bärengesicht mit
Zylinder – Bauplan „Endgegner-Gesicht“), id?, hidden? }` – Form mit `breakable: 'cannon'`; zerlegt von `cannon`, `bomb`, `mega`;
Stampfen, Tatzenhieb, Feuer, Biss, Wurf klopfen nur (`knocks`). Beispiel: `{ kind: 'holzwand', pos: [0,1,-40], size: [4,3,0.6],
content: { star: 2 } }`.

**Licht-Schnittstelle (Welt 3):** Geister/Spuke implementieren `onLight(dt, player)` (z. B. erstarren, sich auflösen); Teststub
`testgeist` (`{ pos, speed?: 1.1, fade?: 0.9, follow?: true }`, schwebt, folgt der nächsten Figur, verletzt bei Berührung, löst sich
nach 0,9 s Licht auf; `light`, `lightCalls`). Modell `testgeist` bzw. `spuk` (state `{ lit: 0..1, alpha }`), sonst Rückfall.

### Präzisierung (Motor Welt 2): Topfpflanze

`topfpflanze` (`{ kind, pos, reach?: 1.7, pause?: 0.35, yaw?, respawn?: 0, id? }`): zahme Schnappblume im Topf (goldener Rand).
Aufheben mit Aktion (Tragen-System, `holdStyle: 'front'`), Aktion wirft sie (Ducken + Aktion: absetzen). Sie schnappt im Takt
(0,5 s) nach vorn nach Gegnern und Münzen in Reichweite – getragen in Blickrichtung der Figur, abgestellt dreht sie sich zum Ziel:
Gegner → `onHit('bite', pflanze)` (Standard-Gegner fliegen weg, zähe zählen Treffer), Münzen → eingesammelt. Geworfen trifft sie
Gegner im Flug (`onHit('throw')`) und bleibt liegen. Der Figur tut sie nichts. Zähler `bites`. Modell `topfpflanze` (×0,8;
state `{ anim: 'idle' | 'snap' | 'carried', progress }`), sonst `schnappblume` (`base: 'pot'`, ×0,72) mit goldenem Topfrand.

Neue `onHit`-Arten: **`cannon`** (Kanonenkugel), **`bite`** (Topfpflanze); `throw` wird jetzt genutzt (geworfene Topfpflanze).
`Enemy.onHit` behandelt unbekannte Arten wie einen Treffer (wegfliegen) – Gegner mit Sonderregeln prüfen die Art selbst.

### Präzisierung (Motor Welt 2): Treibsand und Sandblöcke

**`quicksand`** (Baustein): `{ type: 'quicksand', pos: [x, y, z] (Mitte der Unterseite des Sandkörpers), size: [w, h, d]
(h = Sandtiefe ≥ 1,0, Standard 1,2; Oberfläche = y + h), sink: 0.3 (m/s), slow: 0.5, jump: 0.75, flow?: [fx, fz] (m/s), color?, id? }`.
Ringsum ein **Loch im Boden** lassen (Inseln daneben). Die Figur sinkt ein (`player.sand`, `player.sandDepth`): Lauftempo × `slow`,
Sprung-Geschwindigkeit × `jump` (je tiefer, desto weniger: bei voller Tiefe die Hälfte davon; gemessen 2,6 m/s laufen, 1,8 m Sprung),
kein Salto/Weitsprung; Kopf unter der Oberfläche → `die('sand')` (Klone verschwinden nur; groß nach ≈ 2,8 s). Mit `flow` trägt der
Sand mit (Treibsand-Absturz: über eine Kante ins Nichts). Gegner (`enemy`) und Entitäten mit `sinks: true` sinken ebenso ein und
verschwinden (`markDefeated`, Beute an der Oberfläche). Kollision: Box mit `quicksand: { sink, slow, jump, flow }`, `oneWay`,
`camIgnore` (Gegner betreten sie, Schatten-Blobs liegen darauf; die Figur ignoriert sie und wird von `Player.sandSupport` gehalten),
darunter ein Boden mit `quicksandFloor` (nur für Gegner/Items). Darstellung: stehendes Becken mit Modell `treibsand` (Wirbel,
Sandwall ringsum, `swirl` rad/s), fließender Sand mit einer laufenden Körnungs-Textur. Beispiele: `{ type: 'quicksand', pos: [0,-0.2,-20], size: [6,1.2,4] }`,
`{ type: 'quicksand', pos: [0,-0.2,-60], size: [4,1.2,10], flow: [0,-1.6] }`.

**`sandblock`** (Entität und Baustein): `{ kind: 'sandblock', pos, size?: 1, delay?: 0.45, respawn?: 3, once?: false, id? }` – steht
eine Figur darauf, rieselt er `delay` s und zerbröselt (Form weg), nach `respawn` s baut er sich wieder auf (nur, wenn nichts im
Weg ist). Stampfen, Tatzenhieb, Kanonenkugel, Bombe, Riesentrank, Panzer zerbröseln ihn sofort; Signal `{ drop: id }`. Baustein
für mehrere: `{ type: 'sandblock', blocks: [[x,y,z], …] }`, `{ type: 'sandblock', from, to }` (Reihe/Brücke), `{ type: 'sandblock',
pos, grid: [nx, nz] | [nx, ny, nz] }`. Darstellung: `createInstanced('sandblock', 32)` (Zustände idle → shake → crumble → gone;
je 32 Blöcke 2 Zeichenaufrufe), ohne Registry ein eigener Instanz-Pool.

Effekte (Präzisierung Audio Welten 2–4): `clone` (Klon entsteht), `clone_lost` (Figur weg), `helm_on`/`helm_off`, `cannon`,
`propeller`, `light` (Licht-Helm auf), `quicksand` (in Treibsand), `sand_crumble` (Sandblock), `ghost` (Testgeist löst sich auf).

### Präzisierung (Motor Welt 2): Tests

`tests/course_w2engine.mjs` (Port 4199, `?course=0-3&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`, Hilfen
`window.__t`: `place`, `clone`, `put`, `figs`, `play`, `chase`, `named`): Klon entsteht/gespiegelte Eingabe/Abstoßen/Stapeln bis 5,
Power-ups für alle, Münzen einmal, Treffer/Absturz/verloren je Figur, Haupt-Figur-Wechsel, Kamera-Rahmung, Druckfeld (2) und
Feld-Paar, Viererlift (3 nein, 4 ja, zurück), Figurenschalter (Wechsel über das Pause-Menü), Kanonen-Helm (Holzwand, Gegner, Aktion,
Stampfen hält, Treffer/Ducken+Aktion), Propeller (Aufstieg, Sinken, 8-m-Sims), Licht (onLight, Auflösen), Topfpflanze (Pilzling,
Werfen), Treibsand (Einsinken, Tempo, Sprung, Tod, Gegner, Klon, Fließen), Sandblock (bröselt, kommt wieder), Zielmast mit Klon,
Kennzahlen mit 1 und 5 Figuren. Bilder `tests/out/w2e_*.png`.

---

## Präzisierung (Audio Welten 2–4, Taktuhr)

**Neue Themen** (`music.play(name)`): Welt 2 `course_desert`, `course_space`, `course_shadow`, `course_hills`, `course_cherry`, `course_tank`, `course_house` · Welt 3 `course_snow`, `course_ghost`, `course_plaza`, `course_water`, `course_race`, `course_autumn`, `course_train`, `course_skyway` · Welt 4 `course_canyon`, `course_poison`, `course_beep`, `course_bounce`, `course_ruins`, `course_lavacastle` · Karten `course_world2_map`, `course_world3_map`, `course_world4_map`. Dateien: `src/audio/themes_world2.js` … `themes_world4.js`, Bausteine in `themeParts.js`.

**Welt 5** (`src/audio/themes_world5.js`, nach der Musik-Richtlinie, Namen aus der Welt-5-Liste): `course_beach` (D-Dur, 132 BPM, Steel-Drum/Marimba, Energie-Ebene beim Reiten), `course_trapeze` (F-Dur, 138, Dreier-Gefühl 3+3+2 über Four-on-the-floor), `course_bluelava` (g-Moll, 150, 16 Takte), `course_savanna` (A-Dur, 130, Djembe/Kalimba/Penny-Whistle), `course_mine` (d-Moll, 136, Riff-Bass), `course_cake` (E-Dur, 144, Glockenspiel), `course_sneak` (b-Moll, 130, gedämpft), `course_goldtrain` (H-Dur, 156), `course_temple` (gis-Moll, 146, Gong/Taiko), `course_world5_map` (C-Dur, 128, 16 Takte). Alle 24 Takte (Lava 16, Karte 16); `tests/audio.mjs` prüft die Hooks gegen alle Themen der Welten 1–5.

**Halloween-Welt „Kürbisinsel“** (`src/audio/themes_halloween.js`, `HALLOWEEN_THEMES`, nach der Musik-Richtlinie, Namen aus der Halloween-Level-Liste): `course_pumpkin` (e-Moll/G-Dur, 136 BPM – die Celesta spielt die Hook im Intro in Moll, der Refrain bringt sie in Dur; Kürbis-Klopfen), `course_candyvillage` (F-Dur, 140, Knochen-Xylofon, Pizzicato, Klapper-Hölzer), `course_graveyard` (g-Moll, 132, Theremin, Orgel-Stabs, Friedhofsglocke), `course_witchtower` (a-Moll, 144, Cembalo, Glocken, aufsteigende Hook), `course_brummula` (c-Moll, 148, Kirchenorgel, Chor-Pad, Turmglocke, Pauken), `course_halloween_map` (d-Moll, 126, 16 Takte, Spieluhr-Celesta, Kick auf 1 und 3). Alle 24 Takte (Karte 16), Refrain ab Takt 13 (Karte 9); kein `sync`, keine Energie-Ebene. **Baron-Brummbär-Motiv** (Leitmotiv, aus `course_boss` Lead Takt 5: „C . c Es C G . f Es D“): die Kirchenorgel spielt es im Intro von `course_brummula` in doppelter Notenlänge, die Refrain-Hook des Grafen beginnt mit seinem Kopf. `tests/audio.mjs` prüft die Hooks gegen alle Themen der Welten 1–5 und untereinander, dazu Tempo, Loop-Naht und Pegel wie Welt 5 (`AUDIO_WORLD=halloween`); Hörproben `tests/out/hw_<thema>_30s.wav` und `tests/out/hoerprobe_halloween.wav`.

**Welt 6 „Wolkeninseln“** (`src/audio/themes_world6.js`, `WORLD6_THEMES`, nach der Musik-Richtlinie, Namen aus der Welt-6-Liste): `course_clearpipe` (G-Dur, 140 BPM, Glas-Glocken, „Röhrenpost“-Hook mit Sechzehntel-Paaren, Röhren-Plopp), `course_wreck` (e-Moll, 132, Akkordeon, Schiffsglocke im Doppelschlag, Schunkel-Rhythmus 3+1, Humpa-Bass), `course_fareast` (h-Moll, 140, Bambusflöte, Koto, Gong, Holzblock – pentatonische Hook über i–VI–III–VII), `course_jungle` (F-Dur, 136, Marimba, Congas/Bongos, Vogel-Zwitschern), `course_snowwind` (A-Dur, 134, Glöckchen-„Bimmel“-Hook, Schlittenschellen, Wind-Pad, Windböen-Riser), `course_factory` (d-Moll, 144, Stakkato-Hook, Amboss, Metall-Klirren, Förderband-Ostinato), `course_fuzzymine` (c-Moll, 150, Kletter-Zickzack-Hook, Galopp-Bass), `course_bossblob` (g-Moll, 146, Zirkus-Orgel, Wabbel-Terzen-Hook, Pauken), `course_world6_map` (D-Dur, 128, 16 Takte, Kick auf 1 und 3, Glas-Windspiel). Alle 24 Takte (Karte 16), Refrain ab Takt 13 (Karte 9); kein `sync`, keine Energie-Ebene. Arenen (6-A, 6-B) spielen `course_arena`, 6-Haus `course_house`, 6-Panzer `course_tank`. `tests/audio.mjs` prüft die Hooks gegen alle Themen der Welten 1–6 und der Halloween-Welt, dazu Tempo, Loop-Naht, Klangfarben und Pegel wie Welt 5 (`AUDIO_WORLD=6`, Pegelvergleich mit `AUDIO_WORLD=5,6`); Hörproben `tests/out/w6_<thema>_30s.wav` und `tests/out/hoerprobe_welt6.wav`.

**Welt 7 „Lava-Festung“** (`src/audio/themes_world7.js`, `WORLD7_THEMES`, nach der Musik-Richtlinie, Namen aus der Welt-7-Liste): `course_fortfire` (d-Moll, 142 BPM, Fanfaren-Hook mit Quartsprung, Fanfaren-Bläser im Intro, Feuer-Whoosh vor jedem Abschnitt, fallende Feuerbälle, Knistern), `course_switchruins` (fis-Moll, 134, „Ruf und Echo“-Hook, Steinglocken, großer Hall, Tropfen, Tempelflöte, klackende Kipp-Schalter), `course_redhot` (E-Dur, 150, Countdown-Hook aus Sechzehntel-Paaren, Countdown-Piepser vor Refrain und Loop, Uhr-Ticken, Renn-Arpeggio), `course_bluebelt` (F-Dur, 138, Stampf-Hook in Vierteln, Bläser-Stabs, Stampf-Trommel), `course_traptower` (h-Moll, 146, Galopp-Treppe eine Oktave hinauf, Turm-Glockenspiel, Kettenrasseln, Lava-Riser alle vier Takte, Alarm-Sirene), `course_rammreef` (Es-Dur, 132, „Blubb-blubb“-Hook, Tiefpass auf Piano/Pad/Stabs, Wasserglocken, Blubbern, dumpfe Rammstöße, trotzdem Four-on-the-floor), `course_volcano` (e-Moll, 140, Ausbruch-Hook mit Sechzehntel-Lauf zum Gipfelton, Vulkan-Hörner, Taiko, Grollen), `course_keep` (c-Moll, 148, die Kirchenorgel spielt im Intro das Baron-Brummbär-Motiv aus `course_boss` Lead Takt 5–8 Note für Note; eigene Hook in 3+3+2-Stößen, Chor-Pad in allen Takten, Chor-Stimme, Pauken, Kettenrasseln des Kampfwagens), `course_world7_map` (g-Moll, 126, 16 Takte, Kick auf 1 und 3, Lava-Blubbern, fernes Grollen). Alle 24 Takte (Karte 16), Refrain ab Takt 13 (Karte 9); kein `sync`, keine Energie-Ebene. Arenen (7-A, 7-B, 7-C) spielen `course_arena`, 7-Kapitän `course_diorama`. `tests/audio.mjs` prüft die Hooks gegen alle Themen der Welten 1–7 und der Halloween-Welt, dazu Tempo, Loop-Naht, Klangfarben und Pegel wie Welt 5 (`AUDIO_WORLD=7`, Pegelvergleich mit `AUDIO_WORLD=5,7`); Hörproben `tests/out/w7_<thema>_30s.wav` und `tests/out/hoerprobe_welt7.wav`.

**Welt 8 „Brummbär-Rummelplatz“** (`src/audio/themes_world8.js`, `WORLD8_THEMES`, nach der Musik-Richtlinie, Namen aus der Welt-8-Liste): `course_rainfort` (cis-Moll, 140 BPM, „Donner-Ruf“-Hook mit Quintsprung und rieselnden Sechzehnteln, Festungshörner, Regentropfen, Regenrauschen, Donner), `course_dunes` (A-Dur, 144, Dünen-Schwung-Hook, Wüstenflöte, Kanun-Zupfer, Darbuka, Schellenkranz, Energie-Ebene beim Reiten), `course_cookie` (F-Dur, 138, Spieluhr-Hüpfer-Hook, Spieluhr, Glockenspiel, Holzblock-Klappern, Zahnrad-Ticken), `course_baronexpress` (g-Moll, 146, Kolben-Stoß-Hook aus vier Sechzehnteln, Dampfstöße, Schienenstöße, Dampfpfeife, Zugglocke, Räder-Rhythmus 3-3-2), `course_footlight` (e-Moll, 136, Leucht-Stufen-Hook, Glas-Glocken, glitzernde Sechzehntel-Arpeggien, Leucht-Pings, Stampfstein-Schläge), `course_dungeon` (f-Moll, 130, Wellengang-Hook, Tiefpass und viel Hall, Wasserglocken, Blubbern, Sonar-Ping, Energie-Ebene für den Pflaume-Abschnitt), `course_beamdark` (a-Moll, 132, Kicher-Geist-Hook, Celesta, Geisterbahn-Orgel, Theremin-„Huuu“, Standuhr, Klopfen), `course_inferno` (d-Moll, 150, Felsklotz-Rollen-Hook „da-da-DUM“, Kristall-Glocken, Hoover-Riser, Stampfen, Grollen), `course_finale` (c-Moll, 150, **32 Takte** mit zweitem Refrain: die Kirchenorgel spielt im Intro das Baron-Brummbär-Motiv aus `course_boss` Lead Takt 5–8 Note für Note und in beiden Refrains eine Oktave tiefer als Gegenstimme unter der eigenen Heldenhook für Lotti und Greta; Chor-Pad in allen Takten, Chor-Stimme, Pauken, Turmglocke, Glockenspiel), `course_abspann` (G-Dur, 126, **40 Takte, `loop: false`, ≈ 76 s**: Intro mit Spieluhr, Strophe, Refrain mit „Danke“-Hook über I–V–vi–IV, Erinnerung mit Zitaten aus Welt 1 – die Hook von `course_grass` im Glockenspiel und das Riff von `world1` im Lead –, zweiter Refrain, Schluss e C D G mit langem G-Dur-Akkord; die Musik endet von selbst: danach `music.beat().playing === false` und `music.current === null`, Dauer vorab `music.themeInfo('course_abspann').seconds`; wer länger zeigt, spielt danach z. B. `course_world8_map`), `course_world8_map` (Es-Dur, 128, 16 Takte, Drehorgel im Walzer-Schwung mit „Umpa-pa“ über weichem Four-on-the-floor, Karussell-Glöckchen, Schellen). Sonst 24 Takte, Refrain ab Takt 13 (Karte 9); kein `sync`. 8-A spielt `course_bossblob`, 8-B `course_boss`, 8-Haus `course_house`. `tests/audio.mjs` prüft die Hooks gegen alle Themen der Welten 1–8 und der Halloween-Welt, dazu Tempo, Loop-Naht (Abspann: Schluss und Ausklang), Klangfarben und Pegel wie Welt 5 (`AUDIO_WORLD=8`, Pegelvergleich mit `AUDIO_WORLD=5,8`); Hörproben `tests/out/w8_<thema>_30s.wav`, `tests/out/w8_abspann.wav` (ganzes Stück) und `tests/out/hoerprobe_welt8.wav`.

**Bonuswelt Stern „Sternenzelt“** (`src/audio/themes_star.js`, `STAR_THEMES`, nach der Musik-Richtlinie, Namen aus der Bonuswelten-Liste; keine Anklänge an bekannte Weltraum-, Galaxie- oder Retro-Spielmusik): `course_rainbow` (S-1, E-Dur, 140 BPM, Regenbogen-Bogen-Hook – der Dreiklang schießt in Sechzehnteln zur Oktave, oben ein langer Ton –, aufsteigende Regenbogen-Arpeggien, Glitzer-Glocken, Chor-„Aah“, Energie-Ebene beim Reiten), `course_galaxy` (S-2, As-Dur, 132, Planeten-Sprung-Hook mit Oktavsprung in den Ruf-Takten und gleitender Antwort, Glockenspiel, Chor, Pad in allen Takten, weiter Hall), `course_rollingride` (S-3, B-Dur, 142, Walzen-Rollen-Hook aus zweimal demselben fallenden Sechzehntel-Dreiklang, Marimba, Holzblock, rollende Holz-Sechzehntel, Walzen-Rumpeln), `course_goalpole` (S-4, D-Dur, 150, Hinterher-Hook mit Anlauf-Sechzehnteln zu immer höheren Zielen, Jagdhörner, Flügelschlag-Schellen, Galopp-Bass), `course_blockland` (S-5, C-Dur, 144, Block-Treppen-Hook, Rechteck-Lead und Puls-Stimme im Chip-Stil, Chip-Arpeggien und Rausch-Snare über Eurodance), `course_honeycomb` (S-6, fis-Moll, 136, Summ-Waben-Hook mit Sechzehntel-Triller, summende Bienen-Stimme, Waben-Ostinato aus sechs Tönen, Brummen; B-10 spielt es mit der Klang-Variante `tag`), `course_grotto` (S-7, c-Moll, 130, Riesenschritt-Hook, Riesen-Hörner, große Trommeln als Riesenschritte, Pizzicato-Bass), `course_fogbog` (S-8, h-Moll, 134, Nebelgeist-Hook – punktiert hinab, schleichend zurück –, Celesta, Schlittenschellen, Theremin-Hauch, Nebel-Pad), `course_cosmic` (S-9, e-Moll, 146, Laser-Pingpong-Hook, Arpeggiator, Laser-Stabs, Computer-Piepser, Kanonen-Schläge), `course_worldstar_map` (Des-Dur, 126, 16 Takte, Kick auf 1 und 3, Piano-Strophe, Sternenstaub-Glöckchen, Chor-„Aah“). Allen Level-Themen gemeinsam: Weltraum-Hall (Echo mit zwei Abgriffen), Pad, Sternschnuppen-Riser vor Refrain und Loop. Alle 24 Takte (Karte 16), Refrain ab Takt 13 (Karte 9); kein `sync`. S-Kapitän spielt `course_diorama`. `tests/audio.mjs` prüft die Hooks gegen alle Themen der Welten 1–8, der Halloween-Welt und untereinander, dazu Tempo, Loop-Naht, Klangfarben und Pegel wie Welt 5 (`AUDIO_WORLD=stern`, Pegelvergleich mit `AUDIO_WORLD=5,stern`); Hörproben `tests/out/stern_<thema>_30s.wav` und `tests/out/hoerprobe_stern.wav`.

**Bonuswelten Pilz, Blume, Krone** (`src/audio/themes_bonus.js`, `BONUS_THEMES`, nach der Musik-Richtlinie, Namen aus der Bonuswelten-Liste; kein Baron-Brummbär-Motiv): `course_worldpilz_map` (G-Dur, 128 BPM, 16 Takte, „Pilz-Remix“: Stotter-Hook – nach einer Sechzehntel Pause dreimal derselbe Ton, dann ein Sprung –, Stotter-Stabs und Scratch-Anklänge am Phrasen-Ende, das Piano hüpft die Strophe), `course_worldblume_map` (A-Dur, 126, 16 Takte, die Flöte singt die Strophe, Blüten-Kreisel-Hook, das Glockenspiel spielt sie eine Oktave höher mit, Kick auf 1 und 3, Schellen), `course_worldkrone_map` (B-Dur, 128, 16 Takte, Fanfaren-Strophe, Krönungs-Hook mit Doppelschlag auf dem Gipfelton, Chor-„Aah“, Pauken, Kick auf 1 und 3), `course_bossblitz` (B-12, f-Moll, 148, 24 Takte, Blitz-Zickzack-Hook, Weltraum-Hörner, Arpeggiator, Weltraum-Hall, Blitz-Einschläge, Sternschnuppen-Riser), `course_champion` (K-1, D-Dur, 150, **32 Takte** mit zweitem Refrain, Siegerruf-Hook, Fanfaren, Chor, Chor-Pad in allen Takten, Pauken, Siegesglocke, Glockenspiel im zweiten Refrain). Refrain ab Takt 13 (Karten 9); kein `sync`. `tests/audio.mjs` prüft wie bei Stern (`AUDIO_WORLD=bonus`, Pegelvergleich `AUDIO_WORLD=5,bonus`); Hörproben `tests/out/bonus_<thema>_30s.wav` und `tests/out/hoerprobe_bonus.wav`.

**Klang-Varianten der Remix-Level** (Pilz, Blume; `MUSIC_VARIANTS` in `src/audio/AudioEngine.js`, Wiedergabe in `Music.js`): `music.play(thema, { variant })` oder `music.play({ theme, variant })` (ein Level kann `LEVEL.music = { theme, variant }` so durchreichen; der Funkelstern kehrt danach mit `music.play(LEVEL.music)` zur Variante zurück). `variant` ∈ `nacht` (Tiefpass ≈ 2,3 kHz, Melodie-Spuren über einen milderen Weg, Hall 2,6 s, Hats/Becken/Clap und Glöckchen leiser), `abend` (warm, Höhen −6 dB, sanfter Hall), `morgen` (Höhen +5 dB, kurzer heller Hall, Glöckchen vorn, leises Vogel-Zwitschern im Takt), `tag` (Höhen +3 dB, Echo/Hall des Themas zurückgenommen), `dunkel` (Tiefpass ≈ 1 kHz, die Melodie bleibt über einen milderen Weg hörbar, tiefes Brummen, Hall 3,4 s), `schnell` (Tempo ×1,08, sonst unverändert), `schwarzweiss` (altes Radio: Bandpass 320 Hz–3 kHz, Sättigung, leises Knistern, Mono). Dieselbe Komposition, Pegel wie ohne Variante (±1,5 dB). Ohne oder mit unbekannter Variante klingt es exakt wie bisher (keine zusätzlichen Knoten). Nur die Variante zu wechseln startet das Thema neu (Zählzeit 0); gleiches Thema mit gleicher Variante noch einmal tut nichts. Abfrage `music.variant` (gehört zu `music.current`; vor der Freischaltung die des vorgemerkten Themas), `music.listVariants()`, `music.themeInfo(name, { variant })` (`bpm`/`seconds` der Variante, `baseBpm`), `music.beat().variant`. **Taktuhr:** `beat()`/`onBeat` laufen im Tempo der Variante – bei `schnell` z. B. `course_beep` mit 138,24 BPM, die Piep-Blöcke schalten weiter alle `sync.switchEvery` Zählzeiten (also entsprechend früher); Tempo daher aus `music.beat().bpm` bzw. `themeInfo(name, { variant }).bpm`, nicht aus `THEMES`. Test `AUDIO_PART=varianten` (Gegenprobe ohne Variante, Pegel, Klangcharakter, Taktuhr je Variante); Hörproben `tests/out/varianten_<variante>.wav` (course_grass ab Takt 5, je 15 s) und `tests/out/varianten_ohne.wav`.

**Neue Effekte** (`sfx(name)`): `clone`, `clone_lost`, `helm_on`, `helm_off`, `cannon`, `propeller`, `light`, `quicksand`, `sand_crumble`, `peck`, `bullet`, `boss_hit`, `boss_spin`, `house_tick`, `room_clear`, `ice_slide`, `snowball`, `ghost`, `splash_big`, `train_whistle`, `beep`, `beep_switch`.

**Taktuhr** (für Piep-Blöcke u. ä.):
- `music.beat()` → `{ bpm, beat, bar, phase, playing, inBar, theme, loopBeats, source }` – `beat` = fortlaufende Viertel seit Themenstart (Kommazahl, fällt nie), `bar = floor(beat/4)`, `phase` 0..1, `inBar` 0–3, `source` `'audio'|'ersatz'|'none'`. Ohne Thema `bpm 0`, `playing false`.
- `music.onBeat(fn)` → Abmelden-Funktion; `fn({ beat, bar, inBar, bpm, theme, late })` einmal je ganzer Zählzeit, synchron zur **hörbaren** Musik (Ausgabelatenz berücksichtigt). Ersatzuhr über `performance.now()`, solange Audio nicht freigeschaltet/angehalten ist; Stummschalten ändert die Uhr nicht.
- Themenwechsel setzt `beat` auf 0 zurück → in Piep-Levels die Musik nicht wechseln (z. B. kein Funkelstern-Thema) oder eigene Phase führen.
- `themeInfo('course_beep').sync = { switchEvery: 8, warnBeats: 3 }`: Umschalt-Piep auf Zählzeit 0, 8, 16 …, Warn-Pieps auf den Zählzeiten 5, 6, 7 jedes Achterblocks. Seit der Neukomposition (Musik-Richtlinie) läuft `course_beep` mit **128 BPM** (Wechsel alle 3,75 s); die Themen der Welten 2–4 haben 24 Takte (Haus 8, Karten 16).
- Testhaken: `music.setManualClock(true|false)`, `music.advanceClock(sekunden)` (meldet überschrittene Zählzeiten synchron), `music.manualClock`.

---

## Präzisierung (Gegner Welt 2)

Ergänzung des Gegner-Agenten Welt 2 (Stand: Gegnerzoo `0-6`, Wirbelbrocken-Arena `0-7`). Nichts oben Festgelegtes wird
geändert. Level-Bauer schreiben nur Daten; alle Felder sind optional, sofern nicht anders vermerkt. Die gemeinsamen Felder
und Konter aus „Präzisierung (Gegner/Power-ups)“ gelten weiter (`id, pos, dir|yaw, path, loop, wake, edges, drop`).

### Präzisierung (Gegner Welt 2): Dateien

```
src/course/entities/EnemyW2.js              Basis der Welt-2-Gegner (erweitert Enemy): Ziel = nächste Figur
                                            (level.nearestPlayer), Lava/Absturz = besiegt (zählt für Arenen), Rutsch-Angriff,
                                            STRONG-Treffer, Schatten-Stufen, sharedSlot (Instanz-Gruppen), localOffset
src/course/entities/kinds/  hackvogel, rollpilz (+ grossrollpilz), wuschel, huepfmaus (+ huepfmaus_stachel), marschblock,
                            feuer_werfer (+ hammer_werfer, bumerang_werfer), geschosse (feuerkugel, wurf_hammer,
                            wurf_bumerang), projektilkopf (+ suchkopf), kanone_turm, feuer_schnappblume, lauerblock,
                            muenzmarder (+ muenze_flug), wirbelbrocken; pilzling.js: Option mini
src/course/levels/w0/0-6.js                 Gegnerzoo Wüste (14 Gehege mit Schildern, Z(r, dz) für Tests)
src/course/levels/w0/0-7.js                 Wirbelbrocken-Arena (Archetyp boss, Käfig-Rundplattform, Warp-Box → Ziel)
tests/course_w2_enemies.mjs                 Port 4199: Verhalten/Konter/Schaden je Gegner, Klone, Boss, Bilder w2en_*.png
```

### Präzisierung (Gegner Welt 2): gemeinsame Regeln

- **Ziel = nächste Figur** (`level.nearestPlayer(pos)`, ohne Klon-Motor `level.player`); Gegner, Kanonen, Würfe, Suchköpfe,
  Hüpfmaus-Mitsprung, Lauerblock-Bahn und Münzmarder beachten **jede** Figur (Klone).
- **Lava** (Form `kill: 'lava'`) und Absturz unter `killY` besiegen Welt-2-Gegner (`markDefeated`, `level.onEnemyDefeated`).
  Treibsand (Motor) zieht stehende Gegner hinab.
- **Starke Treffer** `cannon` (Kanonen-Helm-Kugel), `bomb`, `mega`, `star` besiegen sofort (Ausnahmen in der Tabelle); alle
  anderen Arten (`fire, claw, shell, throw, bite`, Stampfwelle `pound` daneben …) wie in Welt 1. **Rutschen**: rutscht eine
  Figur (state `slide`, ≥ 2 m/s) seitlich in einen Welt-2-Gegner, ist das ein Angriff (`onHit('slide')`) statt eines Treffers.
- **Schatten**: Welt-2-Modelle werfen den Sonnenschatten nur mit ihren größten Teilen und nur ≤ 18 m (bzw. 1,35 ×
  Kameraabstand) vom Blickziel der Kamera; der Blob bleibt immer. Kolonnen (Marschblock, Wuschel) teilen sich je Level eine
  Instanz-Gruppe (ganz weit weg unsichtbar).
- Geschosse (`feuerkugel`, `wurf_hammer`, `wurf_bumerang`) und Köpfe verletzen bei Berührung; Geschosse sind keine Gegner.

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| hackvogel | hackt im Takt nach vorn (wind 0,35 s → peck → stuck 0,8 s → pull), zerhackt Blöcke an der Schnabelspitze | Draufspringen bei steckendem Schnabel oder von hinten (von vorn nur Abprall), Stampfen, alles | Schnabelhieb, seitlich |
| rollpilz | läuft; Draufspringen → Rücken (tragbar, nicht besiegt); geworfen/gekickt rollt er und besiegt Gegner (zerplatzt dabei); steht nach 6 s auf | Stampfen auf den Liegenden, Feuer, alles; Wurf in Gegner | seitlich (stehend) |
| grossrollpilz | ×2,6, hp 3; Draufspringen wirft um (−1 hp); liegend lässt er sich stoßen (laufen 5–9, rutschen 9, Tatze 8 m/s) | 3 Treffer, Lava/Absturz (stoßen), Kanone/Bombe/Riese/Stern sofort | seitlich (stehend) |
| wuschel | fährt Bahn/Kreis, unverwundbar | nur Funkelstern/Riesentrank | jede Berührung |
| huepfmaus | läuft mit kleinen Hüpfern, springt mit, wenn eine Figur in 8 m abspringt | Draufspringen, alles, Rutschen | seitlich |
| huepfmaus_stachel | wie oben, Stachelhelm | Feuer, Wurf, Biss, Panzer, Tatze, Stampfwelle daneben, Rutschen, Kanone … | auch von oben |
| marschblock | Kolonne im Gleichschritt auf einer Bahn; Gefahr → Panik, dann zurück in die Reihe | Draufspringen, alles | seitlich |
| feuer_werfer | tänzelt, wirft Salven (Feuer hüpft / Hammer im Bogen / Bumerang kehrt zurück), springt zwischen zwei Ebenen | Draufspringen, alles | seitlich, Geschosse |
| projektilkopf | fliegt geradeaus (optional reitbar) | Draufspringen (Abprall, stürzt ab), Tatze, Panzer, Wurf, Biss, Kanone … (nicht Feuer) | seitlich/vorn |
| suchkopf | lenkt `seek` s zur nächsten Figur, dann Absturz | wie Projektilkopf | seitlich/vorn |
| kanone_turm | feuert alle `interval` s einen Kopf (Ankündigung 0,5 s) | nur Kanonenkugel, Bombe, Riesentrank | – (begehbar) |
| feuer_schnappblume | zielt, spuckt gerade Feuerkugeln (bei 50 % von spit) | Feuer, Wurf, Biss, Stampfwelle daneben, Tatze, Panzer, Kanone … | Kopf (auch von oben), Feuerkugel |
| lauerblock | fährt aus der Wand, wenn eine Figur in der Bahn ist (oder im Takt); trägt, schiebt | nur Riesentrank (Falle, kein `enemy`) | eingeklemmt gegen eine Wand |
| muenzmarder | flieht über seinen Pfad, springt über Lücken, wartet frech, entkommt am Ende | einholen/berühren/angreifen: je Treffer Münzregen, der letzte besiegt | nie |
| pilzling `mini` | halbe Größe, schneller | Draufspringen (platt, ohne Abprall), alles | seitlich |
| wirbelbrocken | Boss: run → spin (Fäuste 1,4 m) → stunned → Treffer → Panzerkugel; 3 Phasen | Draufspringen/Stampfen nur in stunned; Kanonenkugel (nicht als Kugel) | Fäuste, Kugel, seitlich |

### Präzisierung (Gegner Welt 2): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Hackvogel: speed 1.2 (path), period 2.0 (Takt, ≥ Hieb + 0,3 s), stuck 0.8, phase 0..1, track false (in der Pause zur
  //   Figur drehen), sight 9 (hackt nur, wenn eine Figur so nah ist; 0 = immer). Laufzeit: pecks, beakTip()
  { kind: 'hackvogel', pos: [0, 1, -20], dir: [0, 1], sight: 0 },
  { kind: 'hackvogel', pos: [0, 1, -30], path: [[-4, 1, -30], [4, 1, -30]], period: 3.2 },
  // Rollpilz / Großrollpilz: speed 1.5 / 1.1, behavior 'walk'|'chase', sight 6 / 8, chaseSpeed 2.2 / 1.6, up 6 (s auf dem
  //   Rücken), hp 1 / 3. Tragen über das Tragen-System (Aktion), Rennen + Berühren hebt auf, Ducken + Aktion setzt ab.
  { kind: 'rollpilz', pos: [2, 1, -40], path: [[0, 1, -40], [6, 1, -40]] },
  { kind: 'grossrollpilz', id: 'gr1', pos: [0, 2.2, -60], behavior: 'chase' },
  // Wuschel: path (y = Unterkante) | center + radius 2.5 (+ cw), loop (ab 3 Punkten), speed 2.5, count 1, spacing 1.4,
  //   phase 0..1, wait 0 (Pendel-Pause), size 1
  { kind: 'wuschel', path: [[-4, 1.2, -70], [4, 1.2, -70]], speed: 3 },
  { kind: 'wuschel', center: [0, 1.3, -80], radius: 3, count: 4, spacing: 4.7 },
  // Hüpfmaus / Stachel-Hüpfmaus: speed 1.4, jump 1.6 (Mitsprung-Höhe), sight 8, hopEvery 0.55
  { kind: 'huepfmaus', pos: [0, 1, -90], path: [[-4, 1, -90], [4, 1, -90]] },
  { kind: 'huepfmaus_stachel', pos: [3, 1, -95], dir: [-1, 0] },
  // Marschblock: path (für Kolonnen; ohne: 6 m in dir), loop (ab 3 Punkten), count 4, spacing 1.3, speed 1.5,
  //   phase 0..1, colors ['red','blue','yellow','green'] (auch 'orange','purple', Hex), bpm 120, panic 2.5
  { kind: 'marschblock', id: 'mb', path: [[-6, 1, -100], [6, 1, -100], [6, 1, -106], [-6, 1, -106]], count: 6 },
  // Werfer: weapon 'feuer'|'hammer'|'bumerang' (Kurzform kind 'hammer_werfer'/'bumerang_werfer'), axis [1, 0], pace 1.2,
  //   speed 1.2, sight 12, interval 2.0, volley (2 / 3 / 1), first 1.0, jumpEvery 3.4, heights [unten, oben], hop 1.3
  { kind: 'feuer_werfer', weapon: 'hammer', pos: [0, 1, -110], heights: [1, 3.8] },   // + Einweg-Plattform oben (oneWay)
  // Projektil-/Suchkopf (meist von der Kanone): pos (Unterkante), dir, speed 5.5 / 4.2, life 10 / 8, seek 4, turn 1.8,
  //   ride false (reitbare Oberseite), owner
  { kind: 'projektilkopf', pos: [-10, 2, -120], dir: [1, 0], ride: true, speed: 4 },
  // Kanonenturm: height 2, sides 1|2, shot 'projektilkopf'|'suchkopf'|'wechsel', interval 3.0, first 1.0, range 26,
  //   minRange 1.6, max 3, charge 0.5, track false, active true, dazu speed/seek/turn/ride/life für die Köpfe; setActive(b)
  { kind: 'kanone_turm', id: 'k1', pos: [6, 1, -130], dir: [-1, 0], interval: 2.5, shot: 'suchkopf' },
  // Feuer-Schnappblume: base 'pot'|'ground'|'pipe', yaw (Ruhe-Blick), range 9, pause 1.4, burst 1, speed 5.5, hp 1
  { kind: 'feuer_schnappblume', pos: [3, 2.2, -140], base: 'pipe', range: 10 },
  // Lauerblock: pos = Mitte der Unterkante der Vorderseite (Wandfläche), dir = Stoßrichtung, reach 2, size 1, hold 0.7,
  //   cool 0.8, mode 'sense'|'timed', period 3, phase 0..1, sense reach + 0.6. Wand mit Öffnung (size × size, Tiefe size).
  { kind: 'lauerblock', pos: [-4, 1, -150], dir: [1, 0], reach: 2.5 },
  // Münzmarder: path (Fluchtweg; Lücken überspringt er), speed 7, sight 7, lead 12, hp 2, coins 30
  { kind: 'muenzmarder', path: [[0, 1, -160], [0, 1, -180], [8, 1, -186], [8, 1, -210]] },
  // Mini-Pilzling: Pilzling-Felder + mini (speed 2.4, chaseSpeed 3.4)
  { kind: 'pilzling', mini: true, pos: [2, 1, -170], behavior: 'chase', sight: 5 },
  // Wirbelbrocken (Boss): id, pos (Start), arena { center, r: 10 } (Kampffläche), hp 3, wakeR 9 (ohne Boss-Archetyp), drop
  { kind: 'wirbelbrocken', id: 'wirbel', pos: [0, 2, -3], arena: { center: [0, 2, 0], r: 10.6 } },
],
// Boss-Archetyp dazu (siehe „Präzisierung (Arena/Boss)“): speed 0 = keine Fahr-Illusion
boss: { id: 'wirbel', name: 'Wirbelbrocken', speed: 0, trigger: { min, max }, warp: 'warp_sieg', frame: 0.35 },
```

Wirbelbrocken je Phase (hp 3 → 1): Lauf 4,5 / 5,5 / 6,5 m/s (1,6 / 1,3 / 1,0 s), Wirbel 1 / 2 / 3 (je 2,2 / 1,9 / 1,7 s, dazwischen
0,5 s Lauf), Schwindel 1,6 / 1,5 / 1,4 s, Panzerkugel 7 / 9 / 11 m/s (2,6 / 3,0 / 3,4 s, prallt an der Arenagrenze `r − 0,8` und an
Wänden ab). Treffer → `hit` 0,6 s → Kugel; dritter Treffer → `defeated` 2 s → `flee` 1,2 s → `gone` (Archetyp: Sieg, Warp-Box).
Schnittstelle wie Baron: `begin(), reset(), state, stateT, hp, maxHp, phase, visible, home, half, carHits (0), info()`,
`level.onBossHit(boss, 'stomp'|'cannon')`, `level.onBossDefeated(boss)`; Phase 3 zeigt eine eigene Ansage statt „Feuerspur“.
Ohne Boss-Archetyp beginnt der Kampf bei Annäherung (`wakeR`), und `drop` erscheint nach `gone` in der Arenamitte.

### Präzisierung (Gegner Welt 2): Tests und Kennzahlen

`tests/course_w2_enemies.mjs` (Port 4199, `?course=0-6|0-7&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`; Hilfen
`window.__t`: `Z(r, dz)`, `place`, `stomp`, `side`, `action`, `count`, `hurt`): je Gegner Kernverhalten, Besiegen-Weg und
Schadensweg, Rollpilz tragen/werfen besiegt eine Zielscheibe, Großrollpilz in die Lava, Kanone im 3-s-Takt, Reit- und Suchkopf,
Lauerblock trägt/klemmt ein/Takt, Münzmarder (Flucht, Sprung, Münzregen, Entkommen), Rutschen, Klone (Kanone, Werfer,
Hüpfmaus, Wuschel, Marder, Boss zielen auf die nächste Figur), Boss alle drei Phasen, Treffer nur im Fenster, Kanonenkugel,
Sieg → Warp → Zielmast, Tod setzt den Kampf zurück. Gemessen (scale 2, inkl. Schattenpass): Gegnerzoo 66–108 Zeichenaufrufe
(Ziel < 140), ≤ 198 k Dreiecke; Boss-Arena 48–72.

## Präzisierung (Level-Haken)

`LEVEL.setup(level, scene)` (optional) wird einmal aufgerufen, nachdem Level, Spielfigur, Figurengruppe, Kamera und Archetyp aufgebaut sind (`CourseScene.create`). Für Code je Simulationsschritt darin `level.onStep((dt) => …)` anmelden. So bauen Level eigene Szenen (Krümel winkt, Sonder-Rätsel) ohne Umweg über Entitäten mit Aktionen. Ältere Kniffe (z. B. Laterne mit `onLit` als Aufbau-Haken in 2-3/2-4) funktionieren weiter. Für Aufbau vor dem Verschmelzen gibt es jetzt `LEVEL.prebuild`/`LEVEL.build` (Präzisierung „Leistung und Level-Haken 2“).

## Präzisierung (Leistung und Level-Haken 2)

Ergänzungen des Motor-Agenten nach Welt 3 (Wünsche der Level-Bauer an den Motor, vor allem Leistung fürs Handy). Nichts
oben Festgelegtes wird geändert; das Spielbild bleibt gleich (gemessen: Bild mit und ohne Sparmaßnahmen pixelgleich bis auf
Detailstufen ferner Münzen/Blöcke/Käfer), die Routen-Bots laufen unverändert. Alles Folgende gilt ohne Level-Code.

### Präzisierung (Leistung und Level-Haken 2): Dateien

```
src/course/view/Culling.js          Sicht-/Schattenprüfung (Mesh.intersectsFrustum während CourseView.render)
src/course/view/EntityInstancer.js  gleiche Modellteile mehrerer Entitäten als Instanzen (Haupt-/Schattenpass getrennt)
src/course/view/ShadowProxy.js      Schatten-Stellvertreter: Figur aus vielen Teilen wirft ihren Schatten in 1 Aufruf
src/course/view/GroupCuller.js      Instanz-Gruppen (sharedSlot/modelInstances) je Bild auswählen, LEVEL.instances
src/course/view/Xray.js             Durchsicht hoher Blöcke zwischen Kamera und Figur (view.xray, island xray)
src/course/view/lod.js              Detailstufen: Münze, ?-/Ziegel-/benutzte Blöcke (Pools), Käfer (Entitäten)
src/course/view/InstancePool.js     + Auswahl je Bild (nur sichtbare Instanzen), Detailstufen, Schatten-Instanzen
src/course/view/StaticBatcher.js    + spätes addStatic verschmilzt in vorhandene Abschnitte, sehr große Teile in Zellen,
                                      Teile über Abschnittsgrenzen je Abschnitt
src/course/blocks/types/island.js   + top 'rock' (Felsdeckel), xray (Durchsicht)
src/course/entities/EnemyW2.js      + sharedSlot/modelInstances melden ihre Gruppen beim GroupCuller an
src/course/view/Sky.js              + Wolken je Level (LEVEL.sky), je Bild nur Wolken im Bild
src/course/level/LevelLoader.js     + LEVEL.prebuild / LEVEL.build, segments shadow: false
src/course/level/Level.js           + Fern-Ausblendung (farHide) in render()
src/course/archetypes/ScrollDirector.js   Regie des Autoscrollers je Pfadlänge (aus 3-2 übernommen)
src/course/archetypes/KruemelRig.js       Krümel als Diorama-Figur (aus 3-Kapitän übernommen)
src/course/levels/w0/0-L.js         Testlevel „Leistungsprobe“
tests/course_perf.mjs               Messskript (Zeichenaufrufe/Dreiecke je Level an festen Punkten, Bildvergleich)
tests/course_leistung.mjs           Prüfungen der neuen Motor-Funktionen (Port 4963)
```

### Präzisierung (Leistung und Level-Haken 2): Aufbau-Haken

| Feld | wann | wofür |
| --- | --- | --- |
| `LEVEL.prebuild(level)` | vor dem ersten Baustein | lokale Themen-Variante, deren Farben die Bausteine schon nutzen (2-Panzer: Abendrot, Festungspanzer) |
| `LEVEL.build(level)` | nach Bausteinen, Blöcken, Gegnern – vor Items (Münzen, Power-ups, Checkpoint, Sterne, Stempel, Ziel) und vor dem Verschmelzen | statische Zier (`addStatic` landet in den Abschnitts-Meshes), Kollision (zählt für Umriss, Absturzhöhe, Hintergrund), eigene Entitäten |
| `LEVEL.setup(level, scene)` | wie bisher nach Figur, Kamera, Archetyp | Code je Schritt (`level.onStep`), Hüllen |

Spieler, Kamera und Archetyp gibt es in prebuild/build noch nicht. `addStatic` nach dem Verschmelzen (setup, Laufzeit)
verschmilzt der Batcher vor dem nächsten Bild in das vorhandene Mesh derselben Zelle (kein zusätzlicher Zeichenaufruf;
`levelSetup`/`levelSetupE` sind dafür nicht mehr nötig, schaden aber nicht). Der Laternen-Kniff (`onLit`) entfällt: 2-3,
2-4, 3-3, 3-Kapitän nutzen `LEVEL.build`, 2-Panzer `LEVEL.prebuild`; die Laternen stehen weiter als Zier (`hookLamp`).

### Präzisierung (Leistung und Level-Haken 2): Darstellung – was der Motor jetzt selbst spart

- **Sicht- und Schattenprüfung** (`view/Culling.js`): Ein Mesh wirft nur dann in die Schattenkarte, wenn sein Schatten die
  Kamera-Sicht erreichen kann (Begrenzungskugel bzw. Abschnitts-Quader entlang des Lichts bis unter den Umriss verlängert);
  statische Abschnitte werden mit Quadern statt Kugeln geprüft. `view.culling.sphereVisible(x, y, z, r, cast)`,
  `.shadowVisible(…)`, `.boxVisible(box, cast)`, `.camFrustum`, `.camPos` für eigene Auswahl.
- **Statische Geometrie**: sehr große Teile (länger als 80 m oder breiter als 120 m – lange Strecken wie `track`, große
  Böden, Kulissen-Ringe) blähen die Abschnitte nicht mehr auf: mit ≥ 2000 Dreiecken dreiecksweise auf eigene Zellen
  (32 m × 64 m, dünn besetzte Zellen gröber zusammengefasst), sparsame gemeinsam in einem Mesh je Material. Teile über
  48 m Länge mit ≥ 600 Dreiecken (Streuungen, Kulisse über mehrere Abschnitte) werden dreiecksweise je Abschnitt verteilt
  – die Quader der Abschnitte bleiben eng (Hilfen müssen nicht mehr selbst teilen; kürzere Teile über einer Grenze
  bleiben ganz, geteilt kosteten sie mehr Aufrufe, als sie sparen). Dioramen
  (Archetyp `diorama`, sonst `LEVEL.staticSplit: false`) teilen nicht – die Kamera sieht sie ganz.
- **Instanz-Pools** (`view.pool`): je Bild nur Instanzen im Bild bzw. mit Schatten ins Bild (Schatten über eigene
  Instanzgruppen nur im Schattenpass); Detailstufe ferner Exemplare über `opts.lod = { dist, make(vorlage) }`
  (`lod: false` = keine). Motor-Vorgaben (`view/lod.js`): Münze ab 30 m (≈ 110 statt ≈ 430 Dreiecke), ?-/Münz-/Ziegel-/
  benutzte Blöcke ab 28 m (Modell-Stufe `'low'`). Leere Stufen kosten keinen Aufruf. Pool-API unverändert
  (`alloc/set/hide/release`).
- **Gegner-/Modell-Instanzen** (`view/EntityInstancer.js`, automatisch): Meshes der Entitäts-Modelle mit gleicher
  Geometrie + gleichem Material (+ Schattenwurf/-empfang) zeichnen bei ≥ 2 Exemplaren als eine InstancedMesh je Teil
  (auch Instanzgruppen im Modell, z. B. Käferbeine). Nicht instanziert: transparente Teile (außer Entität `instancing =
  'all'`), Material-Listen, Skinning/Morph, eigene Render-Haken, Scherung/Spiegelung in der Weltmatrix, Modelle mit
  eigenem Material je Exemplar (Treffer-Blitz) – die zeichnen wie bisher. Abschalten: Entität/spec `instancing: false`,
  Level `LEVEL.instancing: false`.
- **Detailstufen ferner Entitäten** (`view/lod.js`, nach Art): Flatter-/Krabbelkäfer ab 22 m Kameraabstand als sparsame
  Nachbildung (≈ 650 statt ≈ 4500 Dreiecke, Flügel des Modells bleiben). Entität `lod: false` schaltet ab, `lodDist`
  ändert den Abstand, `lod = { dist, make(entity), anchor(root), keep(mesh), all }` setzt eine eigene.
- **Instanz-Gruppen** (`view/GroupCuller.js`, automatisch): gemeinsame InstancedMeshes vieler Exemplare (EnemyW2
  `sharedSlot` – z. B. Ameisensoldaten –, `modelInstances`/`sharedModelSlot` – z. B. Riesenameisen) zeichnen je Bild nur
  die Exemplare im Bild bzw. mit Schatten ins Bild (zwei Spiegel-InstancedMeshes; die Quelle bleibt Datenquelle). Regeln
  je Gruppe und für Pools (Münzen …) über `LEVEL.instances` (`farHide`, `shadowDist`, `shadow: false`) bzw.
  `view.instanceRule(name, rule)`; eigene Gruppen meldet `view.groupCull(instancedMesh, name)` an.
- **Durchsicht** (`view/Xray.js`): `view.xray(mesh, box, { min })` – der Block wird weich durchscheinend, solange er
  zwischen Kamera und Figur steht; Baustein `island` mit `xray: true` baut das selbst (Kollision mit `camIgnore`).
- **Fern-Ausblendung**: Entität/spec `farHide: m` – weiter als m (waagerecht) von der Haupt-Figur wird das Modell nicht
  gezeichnet (läuft weiter); `LEVEL.farHide: m` gilt für alle Gegner.
- **Schatten-Stellvertreter und Figur-Bündel** (`view/ShadowProxy.js`): Heldin, Ritt (1-4) und Pflaume werfen ihren
  Sonnenschatten in einem Zeichenaufruf (SkinnedMesh mit einem Knochen je Teil, nur im Schattenpass) statt ≈ 14, und im
  Hauptpass zeichnen ihre Teile mit gleichem Material gemeinsam (Heldin ≈ 20 → ≈ 11 Aufrufe; Teile, deren Weltmatrix in
  diesem Bild nicht nur dreht und gleichmäßig skaliert – Blinzeln, Stauchen –, zeichnen dann selbst, damit die Normalen
  stimmen; Teile außerhalb des Bildes fallen wie bisher weg). `view.shadowProxy(root)` für eigene Figuren aus vielen
  starren Teilen.
- **Wolken**: je Bild nur Wolken im Bild.
- `?optimize=0` bzw. `view.optimize = false` schaltet alle Sparmaßnahmen zur Laufzeit ab (Vergleich; Bild muss gleich
  sein). `?still=1` hält Simulation und Darstellungszeit an (Messungen, Bilder über Builds vergleichbar).

### Präzisierung (Leistung und Level-Haken 2): neue Daten-Felder

```js
// Schattenwurf je Baustein: alles, was er zeichnet (statisch, Objekte, Registry-Modelle), wirft keinen Sonnenschatten
{ type: 'island', pos: [0, 0, -140], size: [20, 1, 40], shadow: false },          // auch castShadow: false
{ type: 'deco', castShadow: false, items: [ … ] },
// Wolken je Level: true (Thema) | false | 'above' | 'below' | Anzahl | eigene Liste
sky: { clouds: 'above' },                                    // 3-7: nur die Wolken über dem Level
sky: { clouds: [{ pos: [0, 30, -60], size: 7, drift: 0.4 }] },
// Gegner/Entitäten
{ kind: 'pilzling', pos: [6, 1, -30], farHide: 40, instancing: false, lodDist: 30 },
farHide: 50,                                                 // LEVEL: alle Gegner
// Baustein bande: sparsame Bauweise (≈ 40 statt ≈ 320 Dreiecke je Meter, gleiche Optik; 3-6 nutzt sie über kartBande)
{ type: 'bande', path: [[…], …], detail: 'low' },
// Schalttafel fährt nach dem Abspringen noch coast s weiter (Sprünge über Hindernisse auf der Schiene; Standard 0)
{ type: 'schalttafel', net: 'n1', at: [x, y, z], coast: 1 },
// Drehraum setzt camIgnore auf Hülle und Einbauten selbst (camThrough: false schaltet ab)
// Statische Geometrie: große Teile nicht auf Zellen verteilen (Standard nur im Archetyp diorama)
staticSplit: false,
// Instanz-Gruppen und Pools: Regeln je Name (Gruppen aus EnemyW2 sharedSlot/modelInstances, Pools wie 'coin')
instances: { ameisensoldat: { farHide: 34, shadowDist: 14 }, riesenameise: { farHide: 44, shadowDist: 18 },
  coin: { farHide: 40, shadow: false } },
// Insel mit Felsdeckel (statt top: 'none' + rockLids; Farben Standard theme.rock/theme.dirt) und Durchsicht
{ type: 'island', pos: [0, 0, -40], size: [4, 8, 4], top: 'rock', topColor: 0xd89a68, sideColor: 0xb4643e, xray: true, id: 'wand' },
// Piep-Rutsche mit gröberen Zellen (wie piep_block cell)
{ type: 'piep_rutsche', pos: [0, 2, -60], size: [3.4, 4, 16], cell: 2 },
```

### Präzisierung (Leistung und Level-Haken 2): Archetypen

- **Boss**: `LEVEL.boss.center: [x, y, z]` – die Kampfkamera rahmt seitlich zwischen Figur und Arenamitte (Standard
  `LEVEL.arena.center` bzw. x = 0); `warpBanner: 'Ab in die Röhre!'` (Ansage beim Sieg, `''` = keine); `phaseBanners:
  { 2: 'Er wird wütend!', 3: { text, hold, size, color } }` (je Phase überschreibbar, `''` = keine). 3-Zug, 3-B,
  2-Panzer umgestellt.
- **Autoscroller**: Regie je Pfadlänge in `LEVEL.scroll` (`archetypes/ScrollDirector.js`): `cams: [{ s, pitch, dist, fov,
  height }]`, `frames: [{ s, back, front, ahead, followX }]`, `killUp`, `gates: [{ id, open: s }]`, `reveal: [{ id, at:
  s | 'done' }]`, `fall: { minS, y, x }`, `cap: { s0, s1, up, x, z }`, `sync: { id: t0 }` (fahrende Plattformen/Zäune im
  Takt der Fahrt-Uhr). Am Kettenzaun wird das geerbte Fahrzeugtempo gelöscht. Mit `with: 'boss'` zeigen
  `archetype.boss`/`seenPhase` auf den Zusatz-Archetyp. 3-2 umgestellt (`scrollDirector`/`clockSync` entfallen).
- **Ansagen** (`archetypes/hud.js`): alle Archetyp-HUDs eines Levels teilen eine Warteschlange – eine Ansage erscheint erst,
  wenn die vorige ausgeblendet ist (gleicher Text nicht doppelt, höchstens 3 wartend). `hud.state().banner` = zuletzt
  angeforderte Ansage.
- **Diorama**: `LEVEL.diorama.figure: 'pflaume' | 'kruemel' | (view, player) => rig` (nur Darstellung). 3-Kapitän
  umgestellt (`useKruemel` bleibt als Rückfall).

### Präzisierung (Leistung und Level-Haken 2): Hinweise für Level-Bauer

- Eigene **ShaderMaterials** (oder `onBeforeCompile`-Shader) brauchen am Ende des Fragment-Shaders
  `#include <colorspace_fragment>` (sonst sind die Farben im sRGB-Ausgang zu dunkel/blass); Nebel ggf. `#include
  <fog_fragment>`.
- **Power-ups, die nicht laufen** (Krallen-Anzug, Gleitblatt, Propeller-Helm …), bleiben oben auf dem ?-Block liegen:
  solche Blöcke höchstens ≈ 2 m über dem Boden setzen (Sprunghöhe 3,5 m), sonst erreicht man sie nur mit Kettensprung.
- Gleiche Gegner kosten jetzt kaum mehr als einer; Modelle mit eigenem Material je Exemplar bleiben einzeln (z. B. Spuke
  mit eigener Deckkraft). Statt level-lokaler Instanz-/Fernhilfen genügen die Daten-Felder oben; die Level-Helfer
  `instanceEnemies`, `instanceModels`, `bugSwarm`, `farHide` setzen nur noch diese Felder.
- Lange statische Strecken (Gleise, Banden, Böden) und Streuungen über mehrere Abschnitte müssen nicht mehr gestückelt
  werden.
- `cullStatic` (w2-Hilfe) und `fernAus` (w3-Hilfe) vermessen die Abschnitte neu, sobald sie neue Geometrie bekommen
  (spätes `addStatic`, `levelSetup`) – vorher galten die alten Grenzen, und Kulisse über mehrere Abschnitte verschwand
  zeitweise. `levelSetupLate` ist dafür nicht mehr nötig (schadet nicht).
- Zöpfe/Haar der Heldin rechnen im Kurs in Avatar-Einheiten (vorher 1,5× zu lang, Kollider zu groß – die Zöpfe standen ab).

### Präzisierung (Leistung und Level-Haken 2): Messung

`tests/course_perf.mjs [w1|w2|w3|all|<Id> …]` (Port 4960 + PORT_BASE; je Welt < 10 min): je Level Start, 25/50/75 % der
Strecke, Checkpoints, Sterne, Stempel, Ziel (Autoscroller: sechs Fensterlagen); `PERF_LABEL`, `PERF_BASE` (vorher/nachher),
`DETAIL=1` (größte Posten je Objekt, Haupt- und Schattenpass), `COMPARE=1` (Bild mit/ohne Sparmaßnahmen), `SHOTS=1`,
`POINTS=…`. Ergebnis `tests/out/perf_<Name>.json`.

Stand dieser Präzisierung (Chromium headless mit Software-Rendering, 960 × 540, `?still=1`, Zufall geseedet; Mittel
bzw. Maximum über die Messpunkte je Level; „vorher“ = Motor vor der Präzisierung, gleiche Level-Daten; Welt 4: „vorher“
= master mit den level-lokalen Sparhilfen, „nachher“ = mit Motor und umgestellten Hilfen):

| Level | Aufrufe Ø (max) vorher | nachher | Dreiecke Ø (max) vorher | nachher |
|---|---|---|---|---|
| 1-1 | 90,9 (117) | 49,9 (70) | 244 k (289 k) | 138 k (190 k) |
| 1-2 | 69,5 (103) | 41,5 (64) | 181 k (217 k) | 83 k (118 k) |
| 1-A | 87 (87) | 53 (53) | 187 k (187 k) | 177 k (177 k) |
| 1-3 | 91 (113) | 49,3 (70) | 237 k (271 k) | 125 k (156 k) |
| 1-Schatz | 112,7 (115) | 59,7 (62) | 152 k (152 k) | 107 k (108 k) |
| 1-4 | 97,3 (111) | 66,8 (78) | 193 k (235 k) | 138 k (168 k) |
| 1-5 | 85,9 (112) | 50,5 (76) | 185 k (222 k) | 108 k (144 k) |
| 1-Burg | 88,3 (115) | 46,9 (60) | 217 k (302 k) | 114 k (198 k) |
| 2-1 | 90,4 (112) | 56,6 (83) | 220 k (261 k) | 151 k (222 k) |
| 2-2 | 91,3 (124) | 58,6 (81) | 177 k (223 k) | 105 k (146 k) |
| 2-3 | 88,9 (121) | 53,2 (85) | 236 k (288 k) | 134 k (177 k) |
| 2-4 | 88,2 (109) | 54,1 (74) | 203 k (267 k) | 114 k (194 k) |
| 2-5 | 78,3 (90) | 45,5 (56) | 212 k (258 k) | 113 k (141 k) |
| 2-A | 66 (66) | 41 (41) | 65 k (65 k) | 66 k (66 k) |
| 2-Haus | 58 (58) | 30 (30) | 60 k (60 k) | 58 k (58 k) |
| 2-Panzer | 91,3 (108) | 56,8 (69) | 222 k (266 k) | 136 k (175 k) |
| 3-1 | 89,2 (100) | 51,8 (63) | 229 k (279 k) | 132 k (165 k) |
| 3-2 | 87,5 (111) | 54,5 (75) | 235 k (255 k) | 137 k (167 k) |
| 3-3 | 74,7 (98) | 46,5 (72) | 203 k (268 k) | 149 k (216 k) |
| 3-4 | 80,2 (94) | 52,8 (61) | 166 k (196 k) | 130 k (162 k) |
| 3-5 | 97,1 (137) | 64,2 (102) | 213 k (273 k) | 134 k (214 k) |
| 3-6 | 80,6 (89) | 43,2 (52) | 218 k (248 k) | 96 k (115 k) |
| 3-7 | 79,5 (101) | 53,5 (76) | 223 k (235 k) | 131 k (150 k) |
| 3-A | 53 (53) | 37 (37) | 111 k (111 k) | 111 k (111 k) |
| 3-B | 60,7 (73) | 36 (48) | 176 k (192 k) | 138 k (179 k) |
| 3-Kapitän | 94,8 (96) | 89,5 (91) | 238 k (238 k) | 226 k (227 k) |
| 3-Zug | 90,3 (101) | 60,8 (69) | 216 k (238 k) | 184 k (215 k) |
| 4-1 | 74,9 (91) | 55,5 (76) | 163 k (236 k) | 138 k (208 k) |
| 4-2 | 80,6 (96) | 62,2 (80) | 160 k (222 k) | 137 k (203 k) |
| 4-3 | 83,8 (99) | 57,8 (76) | 191 k (223 k) | 130 k (160 k) |
| 4-4 | 80,7 (101) | 50 (71) | 187 k (220 k) | 127 k (155 k) |
| 4-5 | 86,2 (97) | 54,4 (61) | 212 k (244 k) | 132 k (163 k) |
| 4-A | 74 (74) | 50 (50) | 73 k (73 k) | 74 k (74 k) |
| 4-B | 82 (82) | 57 (57) | 153 k (153 k) | 152 k (152 k) |
| **Welt 1** (Mittel) | 90,3 | 52,2 (-42 %) | 200 k | 124 k (-38 %) |
| **Welt 2** (Mittel) | 81,5 | 49,5 (-39 %) | 174 k | 110 k (-37 %) |
| **Welt 3** (Mittel) | 80,7 | 53,6 (-34 %) | 203 k | 143 k (-30 %) |
| **Welt 4** (Mittel) | 80,3 | 55,3 (-31 %) | 163 k | 127 k (-22 %) |
| **alle 34** (Mittel) | 83,1 | 52,6 (-37 %) | 187 k | 127 k (-32 %) |

Arenen und Dioramen (1-A, 2-A, 2-Haus, 3-A, 4-A, 4-B, 1-Schatz, 3-Kapitän) sieht die Kamera fast ganz – dort sparen vor allem
Instanzen, Pools, Schatten-Stellvertreter und Figur-Bündel Aufrufe; Dreiecke sinken kaum. Die Strecken-Level gewinnen
zusätzlich über die Sicht-/Schattenprüfung, Zellen der großen Teile und die Detailstufen. Faustregel für Welt 4: ein
Strecken-Level liegt jetzt im Mittel bei ≈ 50–60 Aufrufen und ≈ 100–150 k Dreiecken (Spitzen ≈ 80–100 / ≈ 200 k).

## Welt 3 – Level-Liste und Freischaltung (Hauptsitzung)

Welt 3 „Schnee und Eis“ wird nach Sieg über `2-Panzer` frei (Glasröhre am Ende der Welt-2-Insel, bisher „Bald“).
Sternbedarf zählt **alle** gesammelten Sterne (Welt 1 + 2 bieten zusammen ≈ 48).

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `3-1` | parcours (Schneefeld, Eisbahn, Schneebälle, Schlittschuh) | snow | course_snow | 3 + Stempel | Welt 3 offen |
| `3-2` | autoscroller (Himmel, Kettenzäune zum Klettern) | skyway | course_skyway | 3 + Stempel | 3-1 **und ≥ 35 Sterne** |
| `3-3` | parcours (Spukhaus, verschiebbare Treppen/Regale, Licht-Helm) | ghost | course_ghost | 3 + Stempel | 3-2 |
| `3-Kapitän` | diorama (See-Diorama, Wasserstand, Glasröhren-Netz) | diorama | course_diorama | 5 | 3-3 |
| `3-4` | parcours (kurzer Pastell-Garten, 100 s) | plaza | course_plaza | 3 + Stempel | 3-3 |
| `3-A` | arena (rote Käfig-Festung, 3 Zauberkröten) | fortress | course_arena | 1 | 3-4 |
| `3-5` | parcours (Lagune, Röhren-Netz, Unterwasser) | water | course_water | 3 + Stempel | 3-4 |
| `3-6` | parcours (Bergrennen: Boost-Pfeile, Sprungfelder) | race | course_race | 3 + Stempel | 3-5 **und ≥ 45 Sterne** |
| `3-B` | boss (Zirkuszelt-Arena, Schlangenkönig) | circus | course_boss | 1 | 3-6 |
| `3-7` | parcours (Herbstwald, Schalttafeln auf Schienen, Wasserfall) | autumn | course_autumn | 3 + Stempel | 3-6 |
| `3-Zug` | autoscroller + boss (Zugfahrt, Schattenläuferin) | train | course_train | 3 + Stempel | 3-7 **und ≥ 55 Sterne** |

Welt 3 hat 31 Sterne. Neu: Power-up **Gleitblatt** (`gleitblatt`: Schwanzhieb, Gleiten bei gehaltenem Sprung, kurz zur
Statue werden – eigenes Kostüm), **Schlittschuh** (tragbar wie ein Reit-Schuh: schnelles Gleiten auf Eis), Eis-Flächen
(rutschig), rollbare Schneebälle, Kettenzaun-Klettern, Geister (`spuk` folgt, wenn man wegschaut; Licht-Helm bannt).
Wo der Bauplan den „Kapitän“ nennt (3-Zug, 3-Kapitän), tritt **Krümel** auf; „Münz-Dieb“ = **Münzmarder**;
„Prinzessinnen-Figur“ (3-4) = Figurenschalter für **Greta** bzw. **Lotti**.

**Level-Notizen 3-1 / 3-4** (Level-Agent; Hilfen `src/course/levels/w3/_helpers_a.js` ohne `LEVEL`; Test
`tests/course_w3a.mjs [3-1|3-4]`, Port 4371 + PORT_BASE, Bilder `tests/out/w3a_*.png`; `SHOTS_ONLY=1`, `ONLY=<Text|Text>`,
`ROUTE=1`):

- **3-1 „Flockenwiese“** (parcours, snow, course_snow, 400 s, ≈ 255 m nach −Z): Schneefeld-Start (Iglu mit Rauch,
  Schneemann-Familie, Schlitten mit Fußspuren, Lichterkette, ?-Block mit Gleitblatt, Schneebälle: einer zerschellt am
  Felsriegel → 5 Münzen, einer kegelt drei Krabbelkäfer um; Frosttor mit fallenden Eiszapfen) → Flatterfeld (Spalte,
  Felswand mit **Wandloch – Stern 0** hinter neun kreisenden Flatterkäfern, Eisläufer-Teich: auf dem Reit-Eisläufer
  mitfahren, stampfen → Schlittschuh; Checkpoint mit Gleitblatt-Nachschub) → Hasenwiese (**Stern 1**) und **schmaler
  Eissteg (1 m) zum Stempel** → Eisbahn mit zwei Eisläufern und Stachelstreifen (Münzen nur mit Schlittschuh), drei
  schmale Eisstege über dem Abgrund, zweite Eisbahn mit Verfolger → Zielplateau: **Nische in der Felswand – Stern 2**
  (Boden 6,8 m über dem Plateau, vom Dreifachsprung unerreichbar): vom Schneebaum (vier Ast-Stufen, Krone 7,6 m) mit dem
  Gleitblatt hinübergleiten, Propeller-Helm am Wegrand, oder Krallen-Anzug (?-Block) an der Kletterwand; Zielröhre →
  Baumhain hinter der Felswand (zugefrorener Teich mit Robben- und Pinguinkindern, Zielmast). Extraleben: unsichtbarer
  Block über der Iglu-Kuppel. Gegner: Schneesäule 6, Flatterkäfer 9, Eisläufer 4, Mini-Pilzling 4, Krabbelkäfer 7.
- **3-4 „Marzipangarten“** (parcours, plaza, course_plaza, **100 s**, ≈ 125 m): Startinsel unter dem Blumenbogen;
  **Stern 0 auf dem unsichtbaren Wolkenlift bündig hinter der Startinsel** (drei Münzen schweben über ihm, Lift fährt
  10 m hoch) → zwei gegenläufige Schwebeplattformen → Hasenplattform (Brunnen mit Wasserspiel, Pavillon mit begehbarem
  Stufendach, Mosaikweg, Marzipan-Schweinchen; **Stern 1 Hase**; **Stempel**: Lotti- und Greta-Figurenschalter, jeder
  nur für die eigene Heldin, lassen Wolkenstufen zum Stempel erscheinen; Extraleben im unsichtbaren Block über der
  oberen Brunnenschale) → Glasröhre → drei Schwebeplattformen mit Topf-Schnappblumen, rechts die Wolkenkanone in den
  Münzhimmel (**Stern 2**, Regenbogen; zurück per Sprung in die Tiefe) → Pastelltreppe mit Geländer, Pilzlingen und
  Endlos-Münzblock → Zielmast. Gegner: Pilzling 11, Mini-Pilzling 5, Schnappblume 3. Bot-Zeit ≈ 30–36 s.
- **Level-Haken** (`LEVEL.setup`): `levelSetup` (aus `w2/_helpers_c.js`) + `cullStatic` (aus `w2/_helpers_a.js`). Budget-
  Kniffe level-lokal: `instanceEnemies(level, kinds)` zeichnet gleiche Gegner-Modelle (gleiche Registry-Geometrien und
  -Materialien) als je eine InstancedMesh pro Modellteil – die Entitäten rechnen und animieren ihre Modelle weiter, nur
  die Einzelmodelle werden nicht gezeichnet (neun Flatterkäfer ≈ 9 statt ≈ 80 Aufrufe; Pilzlinge, Eisläufer,
  Schneesäulen, Krabbelkäfer); Modelle mit eigenem Material je Exemplar (Schnappblume: Treffer-Blitz) bleiben einzeln
  (dort `noModelShadow` + `farHide`). Ferne Tannenhänge mit `farFirs` (≈ 70 Dreiecke je Baum, ohne Schatten), Wegrand-
  Tannen mit `snowFirs` (≈ 260 statt 3 k des Registry-Modells `tanne_schnee`). Belebte Zier je ein Mesh ohne
  Sonnenschatten (Blob am Boden): Pinguinkinder (watscheln, winken, Bauchrutschen), Robbenkinder, Iglu-Rauch
  (Instanzen), Brunnenwasser.
- **Kennzahlen** (scale 2, inkl. Schattenpass, 18 bzw. 14 Abschnittsbilder): 3-1 72–108 Zeichenaufrufe, 194–268 k
  Dreiecke; 3-4 72–99 / 128–209 k. Wunsch an den Motor: Zeitwarnung (`timewarn`) auch bei Zeitlimits ≤ 120 s (3-4 hat
  100 s; die Warnung bei 100 s Rest entfällt dort, eine bei z. B. 30 s Rest wäre hilfreich).

**Level-Notizen 3-2 / 3-6** (Level-Agent; Hilfen `src/course/levels/w3/_helpers_b.js` ohne `LEVEL`; Test
`tests/course_w3b.mjs [3-2|3-6|all]` bzw. Teilläufe `3-2a` (Laden, Fenster, Routen Lotti + Greta), `3-2b` (Sterne,
Stempel, Einklemmen, Checkpoint, 1-Up), `3-2c` (Bilder je Abschnitt), ebenso `3-6a/b/c` – je < 10 min; Port 4740 +
PORT_BASE, Bilder `tests/out/w3lb_*.png`):

- **3-2 „Gitterbahn über den Wolken“** (autoscroller, skyway, course_skyway, 400 s): Fensterpfad mit drei Richtungen,
  A (0, 0, 6) → B (0, 0, −68) bei s 74 → C (0, 40, −68) bei s 114 → nach +X, Halt bei s 186. **1 Zaunbahn** (−Z,
  Kamera 42°/15 m): Start-Insel, Schiebeplattform P1, links die Ringbahn (Kettenplattform, fährt erst los, wenn man
  aufspringt, durch zwei Goldringe; **Stern 1** hoch über der Bahn nur per Sprung vom Plattformzaun), Insel mit Hubzaun
  (senkt sich, wenn man ankommt, und fährt wieder hoch, kurz bevor die hintere Grenze ihn erreicht – wer trödelt, wird
  eingeklemmt), Bröckelbrücke, ganz rechts die Hubzaun-Gasse (vier Zäune machen nacheinander Platz → **Stern 2**),
  Querplattform P2, Torinsel mit Gittertor (die Warp-Box erscheint, wenn das Fenster ankommt; wer sie auslässt, wird am
  Tor eingeklemmt). **2 Kletteraufstieg** (senkrecht nach oben, Frontalansicht 17°/17 m; unten aus dem Bild = Absturz):
  Checkpoint-Insel (?-Block mit Krallen-Anzug), Zäune K1, K2 (gleitet waagrecht), K3, K4 (fährt senkrecht), K5 →
  Gipfelsims; hinter dem Glasrohr-Eingang Krallenwand mit Zaun → **Stempel**; das Glasrohr öffnet, wenn das Fenster
  oben abbiegt. **3 Wolkenstrecke** (+X, Seitenansicht 27°/15,5 m): Kurbelrad hebt eine Plattform → Zaun → **Stern 3**;
  Wolken, Hebewolke, Bröckelblöcke, Schiebezäune SZ1–SZ3 (hinten anspringen, mitfahren, nach vorn ab), Endstation mit
  Warp-Box beim Halt. **4 Zielinsel** (frei begehbar: Trittsteinweg, Bäume, Seilzaun, Windrad, Wetterhäuschen):
  Kurbelrad → Plattform → Wolke mit **Extraleben**; Zielmast. Kulisse: Kletterturm-Rückwand mit Höhenmarken,
  Ballons, Zeppelin von Baron Brummbär, Möwen, Windräder, Wimpelketten. Gegner: Krabbelkäfer 4, Flatterkäfer 7.
  Route ≈ 128 s (Fahrt).
- **3-6 „Gipfelflitzer-Rennen“** (parcours, race, course_race, 400 s, ≈ 300 m nach −Z): **Rennstart** (Startaufstellung,
  Start-Ziel-Bogen mit Ampel – grün nach 3 s –, Tribüne mit 54 Tierchen (La-Ola), Krallen-Anzug im Baum an der
  Boxengasse, Boost-Pfeile, Sprungfelder über 7- und 8-m-Lücken, unten Pilztrampoline zum Herausspringen) →
  **Gabelung** (bemalter Trennrücken; oben fünf Schnappblumen in Töpfen, unten Bröckelbrücken, Felsbogen mit
  **Stern 1**, Flatterkäfer, Warp-Box hinauf zum Hang) → **Hang** (Ziegelreihe mit Münzblock, Checkpoint mit
  Gleitblatt-Block, Boost-Schräge und zwei Sprungfelder über Gruben; rechts Treppe aufs Plateau zur Warp-Box, bewacht
  von neun Flatterkäfern → Bonus-Oval mit Rennbahnring und vier Boost-Pfeilen: Hase fangen → **Stern 2** auf dem
  Siegertreppchen; über zwei Pilztrampoline → **Stempel**; Warp-Box zurück) → **Schlussabfahrt** (Boost-Tore am
  Aufstieg zum Gipfel; Felsturm mit der letzten Warp-Box – mit Krallen hinauf oder mit dem Gleitblatt vom
  Gipfel-Pilztrampolin hinübergleiten – → Wolkenterrasse mit Regenbogen und **Stern 3**; bemalter Rutschhang,
  Sprungfeld auf die Zielinsel, Zielbogen, zweite Tribüne, Zielmast). **Extraleben** auf dem Tribünendach (über die
  Bande aufs Pilztrampolin am Südende der Tribüne). Gegner: Schnappblume 5, Flatterkäfer 28, Pilzling 3. Route ≈ 32 s
  (unten, Lotti) bzw. ≈ 34 s (oben, Greta).
- **Autoscroller 3-2 ohne Änderung gemeinsamer Dateien** (Level-Haken, `_helpers_b.js`): `scrollDirector` legt
  `rig.railAt` während der Fahrt auf eine Tabelle über die Pfadlänge s (bei senkrechter und seitlicher Fahrt bleibt z
  gleich, z-Abschnitte könnten die Kameras nicht trennen), setzt Fenstergrenzen je s, schaltet bei Fahrt nach oben
  `backMode 'kill'`, nullt das geerbte Fahrzeugtempo für Figuren am Zaun, öffnet das Glasrohr und zeigt Warp-Boxen bei
  s bzw. beim Halt, deckelt die Höhe im Kletteraufstieg und lässt auf der Wolkenstrecke Gefallene abstürzen.
  `clockSync` legt fahrende Zäune auf die Fahrt-Uhr (`scroll.clock` + Versatz je Zaun): nach einem Checkpoint-Neustart
  stehen sie wie damals, der Takt passt immer zum Fenster.
- **Budget-Kniffe** (level-lokal): `bugSwarm` (Käfer als Instanzen; bis 9 m das Registry-Modell, weiter weg eine
  sparsame Nachbildung mit ≈ 650 statt ≈ 4500 Dreiecken), `shadowRange` (Modelle weiter als 30 m ohne Sonnenschatten),
  `trimShadows` (Schnappblume: nur die zwei größten Teile werfen Schatten), `fenceShadows` (Zaun-Netze ohne Schatten),
  `kartBande` (Optik und Kollision wie `bande`, ≈ 40 statt ≈ 320 Dreiecke je Meter), `addStaticParts` (Kulisse je
  32-m-Abschnitt statt eines levelweiten Meshes), Inseln/Fahrbahn ohne Sonnenschatten.
- **Kennzahlen** (scale 2, inkl. Schattenpass): 3-2 18 Bilder 58–101 Zeichenaufrufe, 193–241 k Dreiecke; 3-6 16 Bilder
  74–97 / 189–259 k.
- **Hinweise**: Power-ups, die nicht laufen (Krallen-Anzug, Gleitblatt), bleiben oben auf dem ?-Block liegen – solche
  Blöcke höchstens 2 m hoch setzen (Sprunghöhe 3,5 m), sonst erreicht man sie nur mit dem Kettensprung. Teuer auf langen
  Strecken: Registry-Käfer (≈ 4500 Dreiecke), Baustein `bande` (≈ 320 Dreiecke/m), Münzen (alle Instanzen werden
  immer gezeichnet, ≈ 430 Dreiecke je Münze) – Detailstufen im Motor wären hilfreich (umgesetzt: Präzisierung „Leistung
  und Level-Haken 2“; `scrollDirector`/`clockSync`/`bugSwarm` laufen jetzt im Motor).

**Level-Notizen 3-A / 3-B / 3-Zug** (Level-Agent; Hilfen `src/course/levels/w3/_helpers_e.js` ohne `LEVEL`; Test
`tests/course_w3e.mjs [3-A|3-B|3-Zug]`, Port 4740 + PORT_BASE, Bilder `tests/out/w3z_*.png`; Teilprüfungen 3-Zug mit
`ZUG=basis,lotti,greta,komplett` – je Teil < 10 min):

- **3-A „Krötenzauber im Roten Zwinger“** (arena, fortress, course_arena, 200 s, 1 Stern): roter Käfigraum (≈ 20 × 20 m
  Spielfläche) auf einer kleinen Festung, zwei erhöhte Eckpodeste (2,4 m, je 8 flache Stufen ohne Springen), Zauberkreis
  in der Mitte, Fallgatter mit Brummbär-Wappen, Rundtürme mit wehenden Fahnen, Glutfunken. Drei Zauberkröten (Boden und
  Podeste) – alle besiegt → Stern in der Mitte → Ziel. ?-Block (Funkenblüte), Münzblock auf dem rechten Podest.
- **3-B „Manege frei für den Schlangenkönig“** (boss, circus, course_boss, 400 s, 1 Stern): Vorplatz mit Zirkuswagen,
  Kasse, Plakat, Trommel, Lichterketten (?-Block **Krallen-Anzug**) → Prachttreppe (18 Stufen) zur Seilbahnstation →
  Seilbahn über die Schlucht (fährt, sobald man in der Gondel steht; wer an der Station wartet, holt die leere Gondel
  zurück) → Zeltplateau (Kontrollpunkt) → aufgeschnittenes Zirkuszelt (vordere Hälfte gleitet weg, sobald man drin ist),
  Ränge mit jubelnden Silhouetten, Scheinwerfer. Schlangenkönig: Teller auf Diener-Schlangen (2,8 m) → aufs Haupt
  springen; ab Phase 2 rissige Teller, Felsbrocken von der Kuppel; 3 Treffer → Stern in der Manege, grüne Röhre fährt
  aus dem Boden (Ansage „Ab in die Röhre!“) → Hinterhof mit Feuerwerk und Zielmast.
- **3-Zug „Volldampf durchs Schneetal“** (autoscroller + boss, train, course_train, 400 s, 3 Sterne + Stempel): Bahnhof
  Tannenruh (Wer nicht aufspringt, wird ans Bahnsteigende geschoben und stürzt in die Schlucht) → Fahrt ≈ 593 m auf dem
  Schneetal-Express (15 Wagen), daneben Baron Brummbärs Kanonenzug (11 Wagen): Hüpfquallen, Riesenprojektile quer über
  die Dächer (drüber springen oder mitreiten), Suchkopf-Kanone, Pilzlingsturm (F2), Postwagen mit Dachluke, Riesentrank
  im versteckten Block (F4) und Steinblöcke, Bonuswagen (8 Kisten: 7 × Münzen, 1 × Extraleben), zwei Feuer-Werfer auf
  dem Tender → Halt im Bahnhof Schneetal: Röhre auf der Lok → Drehscheibe vor dem Lokschuppen, **Schattenläuferin**
  (Doppelgänger 2 / 3 / 5, Original mit pinker Schleife, 3 Treffer) → Baron Brummbär braust im Wagen heran, schleudert,
  schimpft und flieht („Welt 3 geschafft!“) → Warp-Box → Zielbahnsteig (Krümel wartet, wenn befreit).
  **Sterne:** 0 an der Hinterkante des letzten Wagens (gleich am Start), 1 im Pilzlingsturm (fünf Stufen abtragen),
  2 Krümel (Geheimröhre auf Flachwagen F3 → Brummbär-Zug, Kiste zerstampfen, Rückröhre aufs Dach von W6).
  **Stempel:** im Postwagen G1 (Dachluke), bewacht von einem Feuer-Werfer. Fahrplan des Bildfensters mit Halte-Pausen
  (`solveTrainRide`), Wagen als Fahrzeuge (`carSegment`: Übergangsplatten über den Kupplungslücken, Holztritte vor
  Personenwagen), Röhren und Krümel fahren mit (`ZugRoehre`, `KruemelZug`).
  **Landschaft** (`schneetalSzene`): Höhenfeld je 32-m-Abschnitt mit Verwehungen und Tiefschnee (Treibsand-Form: wer vom
  Zug fällt, versinkt), drei Schluchten mit Gerüstbrücken, Felswänden, gefrorenem Wasserfall und Eisbächen, Rentierherde
  (galoppiert neben dem Zug, weidet am gefrorenen See), Bahnübergang mit Bahnwärterhaus (Wärter winkt mit der Kelle,
  Schornstein raucht, Warnlichter blinken), Telegrafenleitung, Schneezäune, Formsignale, Wasserkräne, Dampfschwaden der
  Loks, Lokschuppen mit Rangierlok, Dorf mit Kapelle.
- **Level-Haken** (`levelSetupE`): neue Zier wird in vorhandene Abschnitts-Meshes verschmolzen. 3-Zug-Budget level-lokal:
  Gleise in 32-m-Stücken (`trackChunks`), statische Abschnitte je Material zu einem Mesh verschmolzen und nur nahe
  (`StaticCullE`: Sichtpyramide, 95 m, Sonnenschatten nur an Bahnhöfen/Bahnübergang), Wagen außerhalb der Sicht
  ausgeblendet, Räder nur nahe der Kamera, ferne Wagen als Ersatzkörper (eine Instanzgruppe je Bauart), Himmelskranz
  aus, solange der Horizont nicht im Bild ist (`skyDiet`), kleine Teile der Heldin ohne eigenen Sonnenschatten
  (`heroShadowDiet`), Gegner-Schatten nur als Blob (`shadowDiet`).
- **Kennzahlen** (scale 2, inkl. Schattenpass): 3-A 54–120 Zeichenaufrufe / 114–162 k Dreiecke; 3-B 62–97 / 164–273 k;
  3-Zug 62–104 / 185–272 k (Doppelgänger in ruhigen Haltungen als Instanzgruppen: `instanceModels`; die Kampf-Kamera
  des Boss-Archetyps rahmt zwischen Figur und x = 0 – für die seitliche Drehscheibe level-lokal verschoben).
  Wünsche an den Motor: Boss-Ansage „Spring in die Warp-Box!“ je Level einstellbar; Boss-Kamera mit Arenamitte;
  `track` legt den ganzen Pfad in eine Geometrie (lange Strecken müssen gestückelt werden); Räder des Modells
  `zug_waggon` (je 920 Dreiecke × 8) und die Heldin (≈ 17 Meshes) sind die größten Posten im Zug-Budget. (Ansagen,
  Boss-Kamera, Instanzen, Heldin-Schatten umgesetzt: Präzisierung „Leistung und Level-Haken 2“.)

**Level-Notizen 3-5 / 3-7** (Level-Agent; Hilfen `src/course/levels/w3/_helpers_d.js` ohne `LEVEL`; Test
`tests/course_w3d.mjs [3-5|3-7]`, Port 4384 + PORT_BASE, Bilder `tests/out/w3d_*.png`; Teile über `PARTS=route,targets,
extra,shots`, Heldinnen über `HEROES=lotti,greta`, `ONLY=<Text>`, `SHOTS_ONLY=1` – je Lauf ≤ 10 min):

- **3-5 „Leuchtturmriff“** (parcours, water, course_water, 500 s, ≈ 250 m; Wasser y 0, Land y 1): Strand (Strandkörbe,
  Sonnenschirme, Sandburg, Muscheln/Seesterne, Krabben, kleiner Leuchtturm mit Möwen, Flaschenpost; ?-Block mit
  Gleitblatt; flache Lagune mit drei Reifen-Pilzlingen, **grüne Röhren über das Wasser**) → Riffkante → **Tiefwasser**
  (8 m tief, Felswände, Riffkorallen, Seetang, Fischschwärme; Flossling-Schwärme, zwei Stachelfische an der Oberfläche) →
  unter dem **Felsbogen** in die **Flutkammer**: schwimmt eine Figur darin, steigt das Wasser (`flutKammer`, Lagune `flut`
  über `level.setWaterLevel`, 0 → 5 m, Ansage „Die Flut steigt!“; Neustart vor dem Checkpoint setzt es zurück) → Sims mit
  **Glasrohr** (`rohrnetz`) hinab in die **Wrackbucht** (Schiffswrack, Holzsteg mit springenden Flosslingen, Kanonen-Helm
  am Landeplatz; Rissfels: **Wandriss mit der Kanone sprengen → goldene Röhre → Goldraum** mit Goldschalter) → Checkpoint
  → **Stachelwand**: Kanal mit Lochschützen (`stachelfisch` mode `wall`, Löcher als Zier `wandloecher`) in beiden Wänden
  und in drei Felssäulen → Inselchen mit **Glasrohr-Kanone** auf die Zielinsel mit dem großen Leuchtturm (Lichtstrahl).
  **Stern 1** Felsnische oben in der Flutkammer (nur mit gestiegenem Wasser), **Stern 2** Goldraum, **Stern 3**
  unsichtbare Blöcke (`hiddenchain`) von der dritten Säule hinauf zum versteckten Raum im Hochfels; **Stempel**:
  versteckter Gang nach dem Checkpoint (Glasrohr in der Wrackklippe, Eingang zwischen Palmen) auf die Klippe.
  Extraleben: unsichtbarer Block über der Sandburg. Gegner: Reifen-Pilzling 5, Flossling 12, Stachelfisch 13,
  Münzmarder 4. Kamera im Tauchbereich flach (`pitch 20–22, dist 8,5` – sonst Kamera knapp über der Oberfläche und das
  Bild milchig), sonst 42–47° / 12–13,5 m; `LEVEL.underwater` etwas weitere Sicht, Lichtflecken der Unterwasser-Stimmung
  level-lokal zarter (`view.mood.uwSpec.caustics`).
- **3-7 „Ahornklamm“** (parcours, autumn, course_autumn, 500 s, ≈ 235 m; Inseln y 1, Schienen-Oberkante 0,25 →
  Tafel 1,0): Herbstwiese (Laubhaufen, Kürbisse, Fliegenpilze, Eichhörnchen, Vogelscheuche, Laubteppich, Holzbrücke) →
  Tafel 1 über die Klamm zu **Tafel 2, deren Schiene zurück zeigt: Schaltblock darüber stoßen** → Funkenzone: Tafel 3
  fährt zum Prellbock, **Schaltblock stoßen, zurück, an der Weiche nach links (Bildschirm) in die Kehrschleife**
  (Schaltblock am Netzanfang zum Neuversuch) → Checkpoint → Tafel 4 **hinter dem Wasserfall** (`wasserfall`:
  durchscheinender, fließender Vorhang mit Gischt) und durch die Felsgasse → Umstieg auf Tafel 5 (Schaltblöcke an beiden
  Netzenden) → Tafel 6 zur Zielinsel (Laubhügel, Zielmast). Funkenläufer laufen an der Blockkante und auf **Seitenspuren
  der Tafeln** (ausweichen = auf die andere Tafelseite; ein Funkenläufer quer zur Fahrt zwänge zum Springen – dabei bleibt
  die Tafel stehen und die Figur landet im Abgrund). **Stern 1**: während der dritten Fahrt auf die Plattform mit drei
  Zeit-Uhren (`zeitUhren`, je +10 s) springen, Röhre → **Fallraum** (hohler Baum, `hohlerBaum`, Stern mitten im Schacht);
  **Stern 2**: Tafel 5 an der Weiche links kippen, unter der Felsnase durchducken (ohne Ducken reißt sie die Figur von der
  Tafel); **Stern 3**: Tafel 6 ganz rechts auf die Diagonalschiene; **Stempel**: von dort links auf die tiefere Plattform,
  Holzbrücke hinauf zur Zielinsel. Extraleben: Laubhaufen unter der Eiche am Start stampfen. Gegner: Brummer 10,
  Funkenkäfer 7, Funkenläufer 5, Münzmarder 1 (Brummer über den Inseln, nicht über den Schienen: ein Treffer auf der
  fahrenden Tafel wäre ein Absturz).
- **Level-Haken** (`LEVEL.setup`): `levelSetup` + `cullStatic` (Welt 2), `instanceEnemies` (3-1/3-4) für alle Gegner mit
  gleichen Modellen (Fische ohne Sonnenschatten), `fernAus` (statische Abschnitte > 120 m von der Kamera aus, wegen der
  flachen Tauchkamera), sparsame `riffKorallen` (≈ 60–160 Dreiecke statt ≈ 2 k des Registry-Modells), `seaFill` (Meer
  zwischen den Becken bis zum Kulissen-Meer des Themas, das erst 6 m außerhalb des Level-Umrisses beginnt), Laubhaufen als
  level-lokale Entität (Stampfen über `breakable`, Angriffe über `onHit`, Hineinrennen über `onPlayer`); Wolken der
  Kulisse unter den Inseln liegen in 3-7 unter dem Boden (in der Klamm sähen sie wie Schneeflecken aus).
- **Kennzahlen** (scale 2, inkl. Schattenpass, je 16 bzw. 15 Abschnittsbilder und Stern-/Stempel-Bilder): 3-5 72–111
  Zeichenaufrufe, 166–240 k Dreiecke (Flutkammer mit steigender Kamera 88); 3-7 53–103 Zeichenaufrufe, 194–247 k
  Dreiecke (Fallraum 74, Funkenzone 96). Bot-Zeiten bis zum Zielmast: 3-5 Lotti 49,6 s / Greta 45,9 s, 3-7 Lotti
  82,2 s / Greta 81,4 s.

**Level-Notizen 3-3 / 3-Kapitän** (Level-Agent; Hilfen `src/course/levels/w3/_helpers_c.js` ohne `LEVEL`; Test
`tests/course_w3c.mjs [3-3|3-Kapitän]`, Port 4460 + PORT_BASE, Bilder `tests/out/w3c_*.png`; Teile über `PARTS=route,
targets,extra,shots`, `HERO=lotti|greta`, `ONLY=<Text>`, `VERBOSE=1` – je Lauf ≤ 10 min):

- **3-3 „Die Mondscheinvilla“** (parcours, ghost, course_ghost, 500 s): Räume hinter Spuk-Türen liegen nebeneinander in x
  und je in eigenen 32-m-Abschnitten (z) des Batchers. **A Spukflur** (violette Tapete, Läufer, Kerzentischchen,
  Spuke, ein Großspuk, Licht-Helm am Start; Spuk-Treppe zur Tür) → **B Bibliothek** (Schieberegal „Bitte nicht
  schieben!“, Checkpoint, Spuk-Treppen im Takt zu Podest und Galerie, Kronleuchter, Lese-Ecke mit Globus) → **C Außenhof 1**
  (Stimmung `aussen`, Brunnen mit Kreisgeister-Ring, Gräber, Kürbisse, Graben mit Steinplatten, Tür zurück ins Haus) →
  **E Stufenhalle** (drei Spuk-Treppen steigen versetzt aus dem Boden bis zur oberen Tür) → **F Außenhof 2** (Steinbrücke,
  Kreisgeister-Ringe, Großspuke, **falscher Zielmast** „Ziel! (ganz ehrlich)“: spielt den Streich, ein Spuk taucht auf, die
  versteckte Treppe steigt) → **G** Terrasse mit dem echten Zielmast (y 7,6). **Stern 0**: Spuk-Gemälde links am Start
  (Schild „Dieses Bild hat Tiefgang …“) – mit Anlauf hineinspringen → Warp-Box → **Drehraum** (Vierteldrehungen,
  Kreisgeister-Ring; Stern über den Brettern, Kamera flach entlang der Drehachse); **Stempel**: nach Stern 0 die Warp-Box
  im Drehraum → Empore über dem Flur, schwebendes Sofa trägt zum Stempel; **Stern 1**: Bibliothek ganz links, Regal in der
  Regalgasse zurückschieben, Nische mit Lesesessel; **Stern 2**: Sofa-Lift im Flur zum Sims mit der falschen Röhre
  („Außer Betrieb“). Licht-Helme in A, C, E, F. Gegner: Spuk 12 (+1 vom falschen Zielmast), Großspuk 3, Kreisgeister 38
  (Ringe 6/10/8/8, einzeln 6). Bot-Zeiten bis zum echten Zielmast: Lotti 50,3 s, Greta 42,8 s.
- **3-Kapitän „Krümel und der Röhrensee“** (diorama, course_diorama, 400 s, ≈ 26 × 26 m): unten der See (Wasser −1,4)
  mit zwei Holzstegen (ohne Schalter tief im Wasser), oben die Wiese mit Seewärter-Häuschen und **Seewarte** (Turm mit
  Dachterrasse, Fernrohr, Fahne), Glasröhren-Netz `roehre`: Einstieg nur am **Mauseloch** unter der Seewarte →
  Gabelung 1 nach oben auf die Dachterrasse, Kreuzung 2 geradeaus ins Wasser, rechts in die **Glaskuppel** (links nur
  Ausgang); `roehre2` Kuppel ↔ rechtes Ufer. Der **Wasserschalter** in der Kuppel hebt See und Stege (−1,4 → −0,1).
  Sterne: **1** gegenüber dem Start (hinten links), **2** Dachterrasse, **3** an der Kreuzung geradeaus im Wasser, **4** in
  der Kuppel (erscheint mit dem Schalter), **5** Leuchtturm-Inselchen über den gehobenen Steg (beendet das Level).
  Gegner: ein Rammfisch (dreht sich zum Schwimmer und rammt). Zier: Strand-Rampe mit Sonnenschirm, Leuchtturm,
  Ruderboot, Seerosen, Entenfamilie, Picknickdecke, Schild „Röhren-Bahnhof“.
- **Krümel als Spielfigur ohne Archetyp-Änderung**: `LEVEL.setup` ruft `useKruemel(level, scene)`; das ersetzt
  `scene.rig` und den Eintrag in `scene.squad.rigs` durch `KruemelRig` (Registry-Modell `kruemel` × 1,35 mit
  Kapitänsmütze, Rucksack mit Kartenrolle, rot-weißem Schwimmring beim Schwimmen; Animationen idle/hop/cheer/scared,
  swim/pipe/dig; `rig.info()` für Tests). Steuerung bleibt `DioramaController` (kein Sprung, 3,5 m/s). Krümel schwimmt
  nur an der Oberfläche und taucht nicht: Wasser ist Spielelement über Strand-Rampe, Glasröhren und Schalter.
- **Level-Haken und Budget** (level-lokal): statische Zier wird im Aufbau-Haken `hook(pos, fn)` (Laterne mit `onLit`)
  gebaut, damit sie in den Abschnitt ihres Raums fällt; `roomCull(level, rooms, { far })` blendet statische Meshes und
  Modelle anderer Räume (x-Bereiche) sowie ferne Geister aus; Geister und Spuk-Treppen ohne Sonnenschatten (Blob);
  `camThrough(level, tags, min, max)` setzt `camIgnore` auf Drehraum-Bretter und -Hülle (sonst zieht die
  Kamera-Abstandsprüfung die Kamera unter ein Brett über der Figur); Bücher, Tapetenbahnen, Dielen als Flächen;
  `ghostMoods` schaltet die Stimmung `aussen` in den Höfen. 3-Kapitän: Holzstege, Schalter, Laterne und Krümels Kleinteile
  ohne Sonnenschatten; Übersicht mit `center [-0.5, 4, -4]`, `dist [46, 15]`, damit die Seewarte ganz im Bild bleibt.
- **Kennzahlen** (scale 2, inkl. Schattenpass): 3-3 (19 Abschnitts-, 4 Stern-/Stempel-, 2 Mechanik-Bilder) 54–99
  Zeichenaufrufe, 127–278 k Dreiecke (Steinbrücke in F 278 k); 3-Kapitän (9 Bilder) 36–99 / 179–243 k. Wünsche an den
  Motor: Drehraum-Teile mit `camIgnore` im Baustein selbst; offizielle Figurwahl im Diorama (`LEVEL.diorama.figure`)
  statt Rig-Tausch im Haken; Spuke mit gemeinsamem Material (Deckkraft je Instanz), damit sie instanziert werden können.
  (Drehraum-`camIgnore` und `LEVEL.diorama.figure` umgesetzt: Präzisierung „Leistung und Level-Haken 2“; Spuke offen –
  braucht eine Modell-Änderung.)

---

## Präzisierung (Motor Welt 3)

Ergänzung des Motor-Agenten (Stand: Testlevel `0-9` „Schneegarten“). Nichts oben Festgelegtes wird geändert; hier steht,
was Welt 3 (und spätere Welten) an der Spielfigur brauchen: Gleitblatt, Eis, Schlittschuh, Schneeball, Kettenzaun,
Unterwasser, Blick-Schnittstelle für Geister, neue Avatar-Zustände. Level-Bauer schreiben nur Daten; Gegner-/Baustein-
Agenten nutzen die API unten.

### Präzisierung (Motor Welt 3): Dateien

```
src/course/player/powers/gleitblatt.js   Power-up gleitblatt: Schwanzhieb (tailSwipe), Gleiten (def.glide), Statue (Ducken + Aktion)
src/course/player/statue.js              Statue (mode 'script', script.type 'statue'): Sturz, Landung wie Stampfen, Ende
src/course/player/skating.js             Schlittschuh-Physik (skateGround, skateJump, wearSkate, leaveSkate, skateContact)
src/course/player/fencing.js             Kettenzaun-Klettern (tryGrabFence, grabFenceAction, updateFence, fencePunch, fenceCarry …)
src/course/player/underwater.js          Unterwasser-Ansicht (Nebel/Tönung) über view.onFrame – installUnderwaterView(scene)
src/course/player/Player.js              + Eis-Werte, Gleiten, Abtauchen/Strömung, Schieben (onPush), Stachelboden, facingDot,
                                           Haken für Schlittschuh/Zaun/Statue; moveset.js + Welt-3-Werte; HeroRig.js + Zustände
src/course/level/Level.js                + isFacing/anyFacing, fences, waterAt/currentAt/setWaterLevel/waterLevel, floats,
                                           Angriffe rundum (attackInfo.around), spawn: Power-up 'schlittschuh' → Entität
src/course/entities/ice.js               Eis für Entitäten (iceSlide/iceAfterMove/onIce); CourseEntity.moveWithGravity ruft es
src/course/entities/kinds/  schneeball.js, schlittschuh.js, kettenzaun.js (+ kettenplattform)
src/course/blocks/types/    schneeball.js, schlittschuh.js, kettenzaun.js (Bausteine = dieselben Entitäten),
                            w3engine.js (eisbahn, schneefeld, stachelboden), water.js (+ id, current, rise, show)
src/course/CourseScene.js                + installUnderwaterView (eine Zeile), scene.underwater
src/course/levels/w0/0-9.js              Testlevel „Schneegarten“ (Stationen mit Schildern und marks)
tests/course_w3engine.mjs                Port 4229, Bilder tests/out/w3e_*.png, Kennzahlen
```

### Präzisierung (Motor Welt 3): Gleitblatt

Power-up `gleitblatt` (Aliasse `gleit-blatt`, `blatt`, `leaf`), Modell `powerup_gleitblatt` (items_w3.js), HUD-Farbe
0x8fd83a. In Daten wie jedes Power-up: `{ kind: 'powerup', pos, power: 'gleitblatt' }`, `blocks[].content: 'gleitblatt'`,
`drop: 'gleitblatt'`. Treffer: Power-up weg, Figur bleibt groß (Standard).

| Aktion | Eingabe | Wirkung (Werte in `moveset.js`) |
| --- | --- | --- |
| Schwanzhieb | Aktion (Boden/Luft) | 0,32 s (`tailTime`), trifft **rundum** bis 1,2 m (`tailReach`) um die Figur: `onHit('claw', figur)` – wie der Tatzenhieb (besiegt Gegner, zerbricht Ziegel/Kisten, löst ?-Blöcke, stößt Schneebälle) – plus Formen mit `breakable` (`owner.onHit('claw', figur, form)`). `player.attackInfo = { kind: 'claw', around: true, style: 'tail', … }`. In der Luft bremst er den Fall auf 2 m/s. |
| Gleiten | Sprung im Fall gehalten | Fall höchstens 2 m/s (`glideFall`, schnellerer Fall wird mit 40 m/s² abgebremst), leichte Vorwärtsfahrt 2,6 m/s in Blickrichtung (`glideDrift`), volle Luftsteuerung; nicht während Stampfen/Treffer/Salto-Drehung. Gemessen: im Gehtempo (6 m/s) über 16 m weit statt ≈ 7 m – eine 8-m-Lücke ist nur gleitend zu schaffen. |
| Statue | Ducken + Aktion (Luft oder Boden; in der Luft auch während der Stampf-Drehung) | Figur wird Steinstatue: `mode 'script'`, `script.type 'statue'`, `player.statue === true`. Fällt senkrecht mit 22 m/s (`statueFall`); Landung wie die Stampfattacke (Zerbrechliches, `onPound`, Stampfwelle 1,4 m); Gegner, auf die sie fällt: `onHit('pound', figur)`. Dauer: solange Ducken gehalten wird, mindestens 0,6 s, höchstens 3 s (`statueTime`), danach 0,5 s Pause. **Unverwundbar** (Treffer wirkungslos, keine Berührungen) und für Gegner **unsichtbar**: `Enemy.playerActive()`/`activeFigure()` liefern false (Skript-Modus), `level.nearestPlayer` überspringt sie bei mehreren Figuren, `level.isFacing` ist false. Lava/Absturz-Ebenen töten weiter, Wasser beendet die Statue. Plattformen tragen mit. |

Figur-Felder: `tailTime`, `tailDur`, `gliding`, `statue` (Getter), `statueCool`; `player.attack(kind, reach, duration, extra)`
nimmt jetzt `extra` (`{ around: true }` = rundum statt vor der Figur).

### Präzisierung (Motor Welt 3): Eis, Schnee, Stacheln (Formflags und Böden)

| Flag | Wirkung | gesetzt von |
| --- | --- | --- |
| `ice` | Figur: Geschwindigkeit als Vektor, träge: Anlauf bis Gehtempo 6 m/s², darüber 3,5 m/s² (Rennen baut sich langsamer auf: nach 1 s 6 statt 10 m/s), ohne Eingabe 5 m/s² (Bremsweg aus 6 m/s gemessen 3,6 m statt 0,4 m auf Gras), Wenden rutscht (nach 0,25 s Querlenken noch 4,9 m/s in der alten Richtung), kein Schleudern, Rutschen/Ducken 1,5 m/s². **Entitäten** (alle mit `moveWithGravity`, also alle Gegner): die von der KI gesetzte Geschwindigkeit wird nur mit 3,5 m/s² erreicht → Gegner rutschen beim Anhalten/Umkehren (an Kanten auch hinunter). | `island`, `platform`, `ramp` mit `ice: true` (nur Physik), Baustein `eisbahn` |
| `snow` | Schneebälle wachsen darauf (im Thema `snow` wachsen sie auf jedem Boden außer Eis) | Baustein `schneefeld` |
| `spikes` | Stachelboden: wer darauf steht, wird getroffen (Rückstoß senkrecht nach oben, danach 1,5 s unverwundbar); **sicher** mit Schlittschuh, als Statue, unverwundbar (Funkelstern/Riesentrank). Gegner stehen normal darauf. | Baustein `stachelboden` |

Entitäten-API (`entities/ice.js`, für Gegner-Agenten): `onIce(e)` → steht auf Eis; `e.noIce = true` schaltet das Rutschen ab
(eigene Eisläufer-Physik, z. B. Eisläufer-Pilzling), `e.iceAccel` (m/s², Standard `ICE_ACCEL` 3,5) ändert die Trägheit;
`e._iceV` = tatsächliche Geschwindigkeit auf Eis.

```js
// Böden (blocks/types/w3engine.js); pos = Mitte der Unterseite
{ type: 'eisbahn', pos: [6.5, 0.7, -48], size: [13, 0.3, 24] },   // Oberkante 1,0; bis 48 m² mit Modell eisflaeche (≈ 250
                                                                  //  Dreiecke/m²), größer als flache Platte mit Schneerand; model: true|false
{ type: 'schneefeld', pos: [0, 0, -10], size: [26, 1, 36], under: 2.5 },   // Insel mit Schneedecke (snow; ice: true möglich)
{ type: 'stachelboden', pos: [-6, 1, -80], size: [6, 0.25, 4] },          // h < 0,3 = hinauflaufbar (Stufe)
{ type: 'platform', pos: [0, 3, -20], size: [4, 0.6, 4], ice: true },     // vorhandene Bausteine: ice nur Physik
```

### Präzisierung (Motor Welt 3): Schlittschuh

Entität `schlittschuh` (auch `type` in segments): `{ kind: 'schlittschuh', pos, yaw?, respawn?: 4, id?, hidden? }` – liegt
und funkelt (Modell `schlittschuhe`), **Berührung → die Figur steigt hinein** (`player.skate` = Entität; Modi bleiben
ground/air). Auch als Power-up-Name: `content: 'schlittschuh'` (?-Block, steigt heraus), `drop: 'schlittschuh'` (z. B.
Eisläufer-Pilzling), `{ kind: 'powerup', power: 'schlittschuh' }`, Aktion `{ power: 'schlittschuh' }` – `Level.spawn` macht
daraus die Entität; `player.collectPowerup('schlittschuh')` zieht direkt einen an. `respawn`: verloren (Absturz, Tod) →
nach `respawn` s wieder am Startpunkt (Standard 4; aus Blöcken/Beute 0 = weg). Schwimmt (`floats`).

| Regel | Wert |
| --- | --- |
| Tempo | Höchsttempo 12,5 m/s mit Rennen (×0,8 ohne), auf Eis 16 m/s; Anschieben 7 (Eis 9) m/s², Ausrollen 2 (Eis 0,7) m/s², hangabwärts +14 m/s² × Neigung |
| Schwung, Kurven | Geschwindigkeit als Vektor; Lenken 5,5 rad/s ÷ (1 + v/3,5) → bei 12 m/s ≈ 1,2 rad/s; Quergeschwindigkeit baut sich mit 9 (Eis 3,5) m/s² ab (Driften); Stick entgegen = Bremsen 14 m/s² |
| Springen | Laufsprung-Höhe, voller Schwung, keine Saltos/Weitsprünge/Wandsprünge; Landen behält Schwung und Schlittschuh |
| Stacheln | Stachelboden sicher; Gegner von oben, die beim Draufspringen verletzen würden (Stachelhelm), werden zertreten (`skateContact` → `onHit('pound')`) |
| Absteigen | Aktion (Hüpfer nach vorn) bzw. Ducken + Sprung (Absprung); Wasser, Röhre, Glasröhre, Bohnenranke, Zielmast, Tod lassen ihn zurück |
| Treffer | **wirft heraus**: der Schlittschuh fängt den Treffer ab (keine Größe/kein Power-up weg), Figur Rückstoß + 1,5 s unverwundbar, Schlittschuh fliegt im Bogen davon (nach 1,2 s wieder anziehbar) |

Darstellung: Player.state `'skate'` am Boden; die Entität zeichnet das Modell an den Füßen (ohne Drehen/Funkeln), HeroRig hebt
die Hülle um 0,1 m (Kufen) und meldet `proxy.course.skates = true`. API: `wearSkate(p, e)`, `leaveSkate(p, how)` (`'off' |
'jump' | 'hit' | 'gone' | 'lost'`), Entität `wear(p)`, `release(p, how, source)`, `rider`, `worn`.

### Präzisierung (Motor Welt 3): Schneeball

Entität `schneeball` (auch `type`; mehrere: `{ type: 'schneeball', balls: [[x, y, z], …], … }`):

```js
{ kind: 'schneeball', id: 'ball1', pos: [0, 1, -117],   // Auflagepunkt
  size: 1, maxSize: 2,              // Durchmesser (m)
  grow: 'snow',                     // 'snow' (Form snow bzw. Thema snow außer Eis) | true (überall) | false
  growRate: 0.06,                   // m Durchmesser je m Rollweg
  content: 'coins:5',               // beim Zerbrechen: 'coins:N' | 'star:I' | Power-up-Name | Aktion (gimmick.js)
  respawn: 0,                       // s nach dem Zerbrechen wieder am Startpunkt (0 = nie)
  breakSpeed: 2.5, kick: 8 }        // Aufprall-Tempo zum Zerbrechen; Tempo nach einem Angriff (÷ Größe)
```

- **Schieben:** Hineinlaufen schiebt ihn (Player.move ruft `owner.onPush(player, dir, speed)` für jede Wandform eines
  Besitzers mit `onPush` – allgemeine Schiebe-Schnittstelle), Tempo ≈ Lauftempo × 1,12 + 0,6, große Bälle schwerer
  (÷ (0,6 + 0,4·size)). **Angriffe** `claw` (Tatze, Schwanzhieb), `punch`, `shell`, `throw`, `slide`, `bite`, `bump` stoßen ihn
  weg; `fire`, `bomb`, `mega`, `cannon`, Stampfen von oben (`onPound`) und Wasser zerbrechen ihn.
- Rollt mit wenig Reibung (Schnee 1,3, Eis 0,35, sonst 2,4 m/s²), hangabwärts schneller, prallt leicht ab; **wächst** auf
  Schnee; **besiegt Gegner**, die er mit > 1,2 m/s überrollt (`onHit('throw', ball)`); **zerbricht an Wänden** (höher als
  30 % des Balls, Aufprall > breakSpeed) und gibt `content` frei. Gemessen in 0-9: 28,7 m geschoben → 2 m groß, Pilzling
  besiegt, an der Mauer zerbrochen, 5 Münzen.
- Kollision: senkrechter Zylinder (Ø 0,86·size, `noStep`, `mover`) – die Figur kann darauf stehen und wird mitgerollt.
- Laufzeit: `size`, `rolled`, `broken`, `defeats`, `shatter()`, `speed()`, `info()`. Modell `schneeball` (`{ anim, roll, size }`).

### Präzisierung (Motor Welt 3): Kettenzaun und Kettenplattform

```js
{ type: 'kettenzaun', id: 'zaun1', pos: [-6, 1, -158],   // Mitte der Unterkante
  size: [5, 4],                    // Breite entlang des Zauns, Höhe
  yaw: -Math.PI / 2,               // Blickrichtung der Vorderseite (Standard: zur Kamera, Zaun quer, Breite entlang X)
  path: [[3.5, 1, -166], [8.5, 1, -166]], speed: 1.5, mode: 'pingpong', wait: 0.3, phase: 0, idle: false, once: false,
  attach: 'wagen1',                // statt path: fährt auf einem Fahrzeug (vehicle) mit – Autoscroller 3-2
  solid: true, climbable: true }   // dünne Kollisionswand (nur im 90°-Raster der Gier), kletterbar
{ type: 'kettenplattform', id: 'p1', pos: [0, 4, -182], size: [5, 3],   // quer, tief; Oberkante pos.y + 0,35
  fence: true, fenceHeight: 2.5, path: [[-6, 4, -182], [6, 4, -182]], speed: 2 }   // Kletterzaun an der Rückseite
```

- **Greifen:** in der Luft an den Zaun springen (Körpermitte in Zaunhöhe, ≤ 0,62 m vor der Ebene, Bewegung oder Stick zum
  Zaun bzw. ihn berühren) oder am Boden **Aktion** vor dem Zaun (Blick zum Zaun). Nicht mit Last, Schlittschuh, beim
  Stampfen/Treffer; 0,35 s Sperre nach dem Loslassen.
- **Am Zaun:** `mode 'wall'` (Kamera folgt senkrecht wie an einer Wand, Autoscroller/Squad behandeln die Figur wie an einer
  Wand), `player.fence = { obj, side (+1 Vorderseite, −1 Rückseite), t }`, state `'fence'`, `player.fenceMove = { x, y }`.
  Stick links/rechts = am Zaun entlang **in Bildschirmrichtung**, hoch/runter = klettern (3,2 m/s); oben halten die Hände die
  Oberkante; unten Boden = absteigen, unter der Unterkante loslassen. **Sprung** = abspringen (4,5 m/s vom Zaun weg, 3 m
  hoch, Stick lenkt seitlich), **Ducken** = loslassen, **Aktion** = Faustschlag durch den Zaun: Gegner (`enemy` oder
  `onPunch(p)`) bis 1,25 m um die Hand – **auf beiden Seiten** – bekommen `onHit('punch', figur)` (Standard-Gegner fliegen
  weg); der Zaun wackelt.
- **Mitfahren:** fährt der Zaun (eigener Pfad im `level.onStep` vor der Figur bzw. `attach` über `onCarried`), fährt die
  kletternde Figur genau mit (`fence.mover` dieses Schritts, auch Drehung); der Absprung erbt das Tempo. Das Deck der
  Kettenplattform trägt stehende Figuren/Gegner (`mover`).
- Zaun-Schnittstelle (`level.fences`): `plane = { x, y, z, ax, az, nx, nz, w, h }` (Mitte der Unterkante, entlang, Normale
  der Vorderseite), `mover = { dx, dy, dz, vx, vy, vz, dyaw, cx, cz, t }`, `shake(a)`, `start()`, `stop()`, `running`,
  `climbable`. Eigene zaunartige Bausteine tragen sich mit denselben Feldern in `level.fences` ein.
- Modelle `kettenzaun` (`{ anim: 'idle' | 'shake' }`), `kettenplattform` (`{ anim: 'idle' | 'move' }`).

### Präzisierung (Motor Welt 3): Unterwasser

- **Schwimmen** an der Oberfläche wie bisher (Auftrieb; nahe der Oberfläche sanft gebremst, kein Hinausschießen). **Ducken
  taucht ab** (`player.diving`): unter Wasser **ruhiges Sinken** 0,9 m/s (`swimSinkSlow`), **Sprung = Schwimmzug** 4,6 m/s
  nach oben + 1,6 m/s in Stick-Richtung, Sprung gehalten = langsames Steigen 1,1 m/s, Ducken gehalten = schnell abtauchen
  (3,5 m/s); erreicht der Kopf die Oberfläche, schwimmt die Figur wieder oben (Aussprung wie bisher). Zustand
  `'swimUnder'`, solange der Kopf deutlich unter Wasser ist. **Keine Luftanzeige** (wie im Vorbild).
- **Strömung:** Wasserform mit `current` (m/s, auch senkrecht) versetzt schwimmende Figuren (Oberfläche = höchste
  überlappende Wasserform, Strömung aus jeder überlappenden Form). Gegner/Gegenstände: `level.currentAt(x, y, z)`.
- **Wasserspiegel:** Wasserformen mit `waterId` (Baustein `water` mit `id`) fahren über `level.setWaterLevel(id, y, speed =
  1,5)` (m/s; ≤ 0 sofort) auf die Oberfläche y; die Darstellung folgt. Schwimmende Figuren steigen mit (gemessen 3 m in
  1,5 s bei 2 m/s), am Boden stehende beginnen zu schwimmen; **Entitäten mit `floats: true`** (`floatDepth`, Standard 0,3)
  treiben an der Oberfläche und steigen mit (der Schlittschuh schwimmt); Entitäten mit **`onWaterLevel(form, top, dy)`**
  bekommen jeden Schritt, in dem sich ein Wasserspiegel bewegt, einen Aufruf (z. B. Fische, die im Wasser bleiben).
  `level.waterLevel(id)` = aktuelle Höhe, `level.waterAt(x, y, z)` → `{ shape, top, current, id } | null`.
- **Kamera unter Wasser:** `player/underwater.js` (über `view.onFrame`, ohne `src/three`/`view` zu ändern): steckt die Kamera
  in einer Wasserform (bzw. ist die Haupt-Figur getaucht: 60 %), werden Nebel (near/far → 2/30 m) und Hintergrund
  wasserfarben, eine halbdurchsichtige Tönung liegt vor der Kamera; sonst exakt wie vorher. Optional `LEVEL.underwater =
  { color, near, far, tint }`. Für tiefe Becken eine flache Kameraschiene (z. B. `pitch: 20, dist: 8.5`), damit die Kamera
  mit abtaucht. `scene.underwater.info()` → `{ k, cameraUnder, target, fogFar }`.

```js
{ type: 'water', id: 'see', pos: [0, -7, -211], size: [20, 7.6, 30], rise: { to: 3.6, speed: 2, auto: false } },
{ type: 'water', pos: [5, -7, -205], size: [8, 7.6, 6], current: [3, 0, 0], show: false },   // Strömungsfeld im Becken
{ kind: 'pfeld', pos: [7, 1, -192], need: 1, on: { start: 'see' } },   // Signal start → Wasser steigt auf rise.to
// level.named.get('see') = { start(), stop(), setLevel(y, speed), top, shape }
```

### Präzisierung (Motor Welt 3): Blick-Schnittstelle für Geister

- `player.facingDot(pos)` → −1 … 1: Skalarprodukt der (waagerechten) Blickrichtung mit der Richtung zu `pos` (`[x, y, z]`
  oder `{ x, z }`).
- `level.isFacing(fig, pos, angleDeg = 70)` → true, wenn `fig` lebt, nicht im Skript-Modus ist (Röhre, Statue …) und `pos`
  im waagerechten Blickkegel ±angleDeg liegt. `level.anyFacing(pos, angleDeg)` → irgendeine Figur.
- Spuk-Muster: `const p = this.level.nearestPlayer(this.pos); if (this.level.isFacing(p, this.pos)) { /* erstarren */ } else
  { /* folgen */ }` – bei mehreren Figuren besser `this.level.anyFacing(this.pos)`.

### Präzisierung (Motor Welt 3): Avatar-Zustände (HeroRig → `proxy.course`)

| `state` | wann | Zusatzfelder |
| --- | --- | --- |
| `'tailswipe'` | Schwanzhieb (`player.tailTime > 0`; über dem Bewegungszustand, nach `'throw'`, vor `'claw'`) | `phase` 0..1 |
| `'glide'` | Gleiten (Gleitblatt, Sprung gehalten im Fall) | – |
| `'statue'` | Statue | `phase` = Anteil der Höchstdauer |
| `'fence'` | am Kettenzaun | `fenceMove = { x, y }` (−1..1, x = Bildschirm rechts), `fencePunch` 0..1 beim Faustschlag, `speed` |
| `'skate'` | auf dem Schlittschuh am Boden (in der Luft die normalen Sprungzustände) | `speed` (m/s), `skates = true` (auch in der Luft) |
| `'swimUnder'` | getaucht | – |

`proxy.course.power = 'gleitblatt'` mit dem Gleitblatt (Kostüm). Fehlt dem Avatar eine Pose, fällt er auf Bestehendes zurück.

### Präzisierung (Motor Welt 3): Hinweise für Folge-Agenten

- **Neue `onHit`-Arten:** `punch` (Faustschlag durch den Zaun); `throw` nutzt jetzt der Schneeball; Schwanzhieb = `claw` mit
  `source.attackInfo?.style === 'tail'`; Statue = `pound`. `Enemy.onHit` behandelt unbekannte Arten wie einen Treffer.
- **Gegner (Welt 3):** Eisläufer-Pilzling: `noIce: true` + eigene Gleitphysik oder das Standard-Rutschen; Beute `drop:
  'schlittschuh'`. Flossling/Stachelfisch: `level.waterAt`/`currentAt`; `floats: true` für Treibendes. Spuk/Kreisgeist:
  `level.isFacing`/`anyFacing`; Licht-Helm weiter über `onLight(dt, player)`. Krabbel-/Flatterkäfer am Zaun: `level.fences`
  liefert die Ebene; der Faustschlag trifft sie mit `onHit('punch')`.
- **Bausteine/Level:** `ice` an `island/platform/ramp` ändert nur die Physik – für sichtbares Eis `eisbahn`; Schneebälle
  wachsen im Thema `snow` überall außer auf Eis. Zäune im 90°-Raster drehen (Kollision achsenparallel). Fahrende Zäune über
  `path` oder `attach` an ein `vehicle` (3-2). Wasser mit `id` für Wasserstands-Rätsel (3-5, 3-Kapitän).

### Präzisierung (Motor Welt 3): Tests und Kennzahlen

`tests/course_w3engine.mjs` (Port 4229, `?course=0-9&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`, Hilfen
`window.__t`: `place`, `play`, `stick`, `named`, `spawn`, `count`, `rig`, `coins`, `uw`): Gleitblatt (einsammeln, ?-Block,
Schwanzhieb rundum gegen Pilzling und Ziegel, 8-m-Lücke ohne/mit Gleiten, Fall ≤ 2 m/s, Vorwärtsfahrt, Statue: Sturz auf
einen Pilzling, unverwundbar, Jäger ignoriert sie, Ende nach 3 s bzw. beim Loslassen, Treffer → normal groß), Eis (Bremsweg,
Wenden, Anlauf, Gegner rutschen), Schlittschuh (Einsteigen, 12,5/16 m/s, Kurven, Sprung, Stachelboden, Treffer wirft heraus,
Aussteigen, ?-Block), Schneeball (schieben, wachsen, Pilzling, Mauer + Münzen, draufstehen, Schwanzhieb), Kettenzaun (greifen,
klettern, Faustschlag, abspringen, mitfahren, Kettenplattform, Zaun auf einem Fahrzeug), Unterwasser (abtauchen, sinken,
Schwimmzug, auftauchen, Kamera-Haken an/aus, Strömung, Wasserspiegel, onWaterLevel, Druckfeld, floats), isFacing, alle
HeroRig-Zustände – 66 Prüfungen. Gemessen im Schneegarten (scale 2, inkl. Schattenpass): 63–94 Zeichenaufrufe, 93–127 k
Dreiecke (die Eisbahn mit dem Modell eisflaeche kostet ≈ 250 Dreiecke/m² – große Bahnen deshalb als flache Platte).

## Präzisierung (Bausteine Welt 3)

Ergänzung des Bausteine-Agenten (Stand: Winterwerkstatt 0-13). Nichts oben Festgelegtes wird geändert. Alle Welt-3-
Bausteine, Gimmicks und Themen sind parametrierbare Module; Level-Bauer setzen sie nur in Daten ein. Jede Datei
dokumentiert ihre Parameter vollständig im Kopfkommentar; hier die Felder mit Beispielen. Aktionen (`onOpen`, `onPress`,
`onTrick`, `onBreak`, `onFull`, `onLaunch`, `onReveal`, `reward`, `content` …) im bekannten Format (Präzisierung
Sonder-Bausteine) – **neu: `water: { id, y | dy, speed }`** (Wasserstand, s. u.). Signale an benannte Objekte über
`level.named` (Daten-`id`). Alle Entitäts-Gimmicks (`kind`) sind auch als `type` in `segments` erlaubt (`w3_misc.js`).

### Präzisierung (Bausteine Welt 3): Dateien

```
src/course/blocks/types/w3_rails.js     schiene, schalttafel (Schienennetz mit Weichen; Schaltblock: Entität)
src/course/blocks/types/w3_ghost.js     spuk_treppe, spuk_sofa, kronleuchter, drehraum
src/course/blocks/types/w3_water.js     lagune, holzsteg, steg, rohrnetz, rohrteile, koralle, seetang, blasen, schiffswrack
src/course/blocks/types/w3_race.js      boost_rampe, boost_tor, sprungfeld, pilztrampolin, bande, start_bogen, rutschhang
src/course/blocks/types/w3_sky.js       kettenbahn (Bahn-Optik), broeckelblock, wolkenlift
src/course/blocks/types/w3_snow.js      eisflaeche (auf der Motor-eisbahn), iglu, schneebloecke
src/course/blocks/types/w3_scene.js     bahnsteig, parallelgleis, zirkuszelt, manege, zirkuspodest, seilbahn, rosa_gras,
                                        bunter_stein, pastell_blume, hecken_hase
src/course/blocks/types/deco_w3.js      Kulisse Welt 3 (verschmolzen; shadow: false für ferne Kulisse)
src/course/blocks/types/w3_misc.js      Entitäts-Gimmicks auch als segments-type
src/course/blocks/w3kit.js              sharedInstances (createInstanced je Level), wantOf, rotXZ/yawBox/snapYaw, waterTopAt,
                                        banner, slideSlope (Rutschhang)
src/course/blocks/water_level.js        setWaterLevel / waterTop (Aktion water; Rückfall ohne Motor-Haken)
src/course/entities/kinds/w3_gimmicks.js  schaltblock, buecherregal, bilderrahmen, zielmast_spuk, spuk_tuer, wasserschalter,
                                        goldring, wandriss, kurbelrad
src/course/entities/kinds/w3_snow.js    schneeblock, eisblock, eiszapfen, schneehaufen, tanne
src/course/view/theme_snow|skyway|ghost|plaza|fortress|water|race|autumn|train.js, backdrop_w3.js   Themen + Kulissen
src/course/view/mood.js                 Stimmungen und Unterwasser-Stimmung (ViewMood)
src/course/levels/w0/0-13.js            Winterwerkstatt (eine Station je Baustein, marks für den Test)
tests/course_w3_blocks.mjs              Port 4350, Bilder tests/out/w3b_*.png (auch je Thema w3b_thema_*.png, w3b_unterwasser.png)
```

Additiv geändert: `view/themes.js` (9 Registrierzeilen, `??=`), `view/CourseView.js` (Haken `setMood`, `setUnderwater`,
`underwater`; Stimmung je Bild, Hintergrundfarbe aus der Stimmung), `entities/gimmick.js` (Aktion `water`, 3 Zeilen),
`entities/kinds/vehicle.js` (Zug-Stile `lok|wagen|flach` mit Modell `zug_waggon`).

### Präzisierung (Bausteine Welt 3): Schnittstellen zu Motor und Ansicht

- **Unterwasser (Ansicht):** zwei Teile, die zusammenspielen. Der Motor (`player/underwater.js`, `scene.underwater`)
  rechnet je Bild die Stärke `state.k` (1 = Kamera im Wasser, 0,6 = Figur getaucht `swimUnder`) und färbt damit Nebel
  und Hintergrund und legt die Tönung vor die Kamera. Die Ansicht (`view/mood.js`) ergänzt im Modus `'auto'` (Standard
  bei Themen mit `underwater`) – sobald `scene.underwater.state.k ≥ 0,3` **oder** die Figur schwimmend mit dem Kopf
  unter der Oberfläche ist (`pos.y + 2·half.y − 0,12 < water.top`) – kühles, gedämpftes Himmels- und Sonnenlicht,
  dunklere Kuppel, Licht an der Figur ×0,8 und eine additive Bild-Überlagerung mit wandernden Lichtflecken und
  Lichtstrahlen (1 Zeichenaufruf; weich in ≈ 0,3 s). `level.view.setUnderwater(true | false)` erzwingt die Stimmung
  (dann setzt sie auch Nebel 2–40 m und Hintergrund selbst), `'auto'` gibt sie wieder frei. Die Motor-Ansicht läuft je
  Bild nach der Stimmung, im Wasser bestimmt sie also Nebel/Hintergrund. `view.underwater` → bool, `view.mood.info()` →
  `{ mood, water (0..1), forced, auto, motorK }`. Werte je Thema: `theme.underwater = { fog: { color, near, far },
  background, hemi: { sky, ground, intensity }, sun: { color, intensity }, dome, playerLight, caustics (0,45), color }`
  (alles optional); Nebelfarbe der Motor-Ansicht: `LEVEL.underwater` bzw. `theme.waterDeep`.
- **Stimmungen (Ansicht):** `level.view.setMood(name | null, { time: 0.8 })` blendet zur Stimmung `theme.moods[name]`
  (gleiche Felder wie oben) bzw. zurück zur Grundstimmung. Thema `ghost`: Grundstimmung innen, `'aussen'` (Außenhof bei
  Nacht, Mondlicht), `'innen'`. Die Spuk-Tür ruft es beim Durchgang (`mood`). Themen ohne `moods` ignorieren den Aufruf.
- **Wasserstand:** Aktion `{ water: { id, y | dy, speed: 1.5 } }` (z. B. `wasserschalter.water`, `onAll`, Level-Haken).
  Reihenfolge: benanntes Objekt mit `setLevel(y, speed)` (Baustein `lagune`, Motor-`water` mit `id`; beide fahren über
  `level.setWaterLevel`) → `level.setWaterLevel(id, y, speed)` des Motors (alle Formen mit `waterId` = id; Auftrieb,
  `floats`, `onWaterLevel`) → Rückfall ohne Motor-Haken: Wasserformen mit `waterId`/`tag` = id bzw. `named.shape`
  werden direkt angehoben. Die `lagune` trägt `waterId`, `current` und `rise` wie der Motor-Baustein `water`. `waterTop(level, id)`, `waterTopAt(level, x, z)` lesen den Stand; der `holzsteg` folgt dem
  Wasser unter sich (Strahl auf Wasserformen) und funktioniert so mit jedem Wasser.
- **Eis:** `eisflaeche` baut auf dem Motor-Baustein `eisbahn` auf (oberste 0,2 m: Form mit `ice`, Tag `eisbahn`, Modell
  `eisflaeche` bis 48 m², sonst glatte Platte) und ergänzt Sockel (feste Form `eisflaeche:sockel`, Schnee/Fels-Optik)
  und Schneewulst-Kanten. Ohne Sockel genügt `eisbahn`; `island`/`platform`/`ramp`/`rosa_gras` mit `ice: true` geben
  nur die Physik.
- **Rutschhang:** Rampe mit Flag `slide: true`; der Baustein meldet dem Motor die Neigung als mindestens `slope` (0,85 >
  `slopeSlide` 0,75) – die Figur rutscht ohne Ducken bergab (bis 16 m/s). Liest der Motor später `slide` selbst, bleibt
  das verträglich.
- **Kettenzaun/Kettenplattform:** baut der Motor (`kettenzaun`, `kettenplattform`, Präzisierung Motor Welt 3); dazu hier
  nur `kettenbahn` – die sichtbare Bahn (Träger mit Laufrollen) unter demselben Pfad.
- **Schieben:** `buecherregal` meldet sich über die Motor-Schnittstelle `onPush(player, dir, speed)` (Wandform-Besitzer):
  Hineinlaufen schiebt sofort; die eigene Anlage-Erkennung (Stick gegen die Seite) hält das Schieben danach.
- **Zug:** `vehicle` (Autoscroller) mit `style: 'lok' | 'wagen' | 'flach'` nutzt das Modell `zug_waggon` (Räder/Dampf
  im Fahrzustand). Begehbare Oberkanten: Lok-Führerhaus 3,96 m (Kessel 3,2 m, Fahrgestell 1,26 m), Wagendach 3,75 m,
  Flachwagen 1,39 m; Standardgrößen [3, 3,96, 8,5] / [2,8, 3,75, 10] / [3, 1,39, 10] (`size` = Breite, Oberkante, Länge).
- **Geteilte Instanzen:** Schnee-/Eisblöcke, Tannen und Eiszapfen liegen je Level in einer Instanz-Gruppe
  (`createInstanced`, 200/120 Plätze) – 1–2 Zeichenaufrufe für alle.
- **Ansagen:** `banner(level, text, opts)` (w3kit) nutzt das Archetyp-HUD oder ein eigenes (`level.lastBanner` für Tests).

### Präzisierung (Bausteine Welt 3): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `schiene` | Schienenstrang; gleiche `net` = Netz, Enden verbinden sich (≤ 0,35 m), endet ein Strang auf einem anderen → Weiche; Ecken als Bögen | `net`, `path` (y = Schienen-Oberkante), `dir` 1 (Fahrt path[0] → Ende; −1 umgekehrt), `radius` 2, `posts` 0, `color`; `level.named.get(net)` = `{ sign, reverse(), toggle(), nodes, edges, boards, info() }` | `{ type: 'schiene', net: 'n1', path: [[0,0.4,-37],[0,0.4,-74]] }`, Abzweig: `{ type: 'schiene', net: 'n1', path: [[0,0.4,-50],[-6,0.4,-57],[-6,0.4,-74]], radius: 3 }` |
| `schalttafel` | 3×3-Tafel (Oberkante Schiene + 0,75) fährt nur, solange eine Figur draufsteht (sanft an/ab), trägt; an Weichen Neigung (Stick seitlich bzw. Stellung auf der Tafel): links/rechts/geradeaus; am Strangende Halt | `net`, `at` (Start, auf die nächste Schiene gesetzt), `size` 3, `speed` 3.5, `accel` 6, `brake` 10, `tilt` 0.3, `id` → `{ box, pos, edge, s, v, tilt, stopped, lastChoice, info() }` | `{ type: 'schalttafel', id: 'tafel', net: 'n1', at: [0,0.4,-38.5] }` |
| `schaltblock` | Kopfstoß/Stampfen kehrt die Fahrtrichtung aller Stränge des Netzes um (Signal `{ toggle: net }` ebenso) | `pos`, `net` (Name oder Liste), `id`; Laufzeit `hits` | `{ kind: 'schaltblock', pos: [4,3.6,-38], net: 'n1' }` |
| `buecherregal` | Hineinlaufen (Motor-`onPush`, danach Anlage gegen die Seite) schiebt entlang `slide` (1,8 m/s), Angriffe stoßen 1 m weiter; Ende des Wegs → `onOpen` einmal | `pos`, `yaw` −π/2 (90°-Raster), `width` 2, `height` 2.8, `slide` [1,0], `range` [0,2], `speed` 1.8, `onOpen`, `id`; Laufzeit `off`, `opened` | `{ kind: 'buecherregal', pos: [-6,1,-86], range: [0,2.5], onOpen: { reveal: 'stern_regal' } }` |
| `spuk_treppe` | verschiebbare Treppe (steigt nach lokal +X) fährt aus der Versteck-Lage `from` an `pos`: bei Annäherung / Signal / im Takt | `pos` (untere Vorderkante), `yaw` 0, `steps` 4, `width` 2, `rise` 0.5, `run` 0.6, `from` [0,0,−3], `mode` 'near'\|'signal'\|'shift', `near` 5, `speed` 2, `period` 3, `back` 0, `out`, `id` (`open/close/toggle/start`) | `{ type: 'spuk_treppe', pos: [5,1,-88], from: [0,0,-3], near: 4 }` |
| `spuk_sofa` | Sofa-Lift: Figur darauf → nach `delay` schwebt es `rise` m hoch (oder den `path`), oben wartet es, leer sinkt es nach `back` s | `pos`, `yaw` −π/2, `rise` 4, `path`, `speed` 1.6, `delay` 0.4, `back` 2.5, `id` → `{ k, y, state }` | `{ type: 'spuk_sofa', pos: [0,1,-98], rise: 4 }` |
| `kronleuchter` | pendelnder Kronleuchter als Plattform (Ring trägt, Figur schwingt mit) | `pos` (Aufhängung), `chain` 1.2, `scale` 1.6, `axis` 'x'\|'z', `amp` 0.35, `period` 3.2, `phase`, `light`, `id` | `{ type: 'kronleuchter', pos: [-8,9,-100], axis: 'x' }` |
| `bilderrahmen` | Gemälde verdeckt eine Wandnische (fest), Hineinspringen/Angriff/`open` klappt es auf, die Warp-Box in der Nische erscheint | `pos` (Unterkante in der Wandebene), `yaw` −π/2, `size` [1.4,1.8], `motif` 'spuk'\|'portraet'\|'landschaft', `watch`, `solid`, `warp: { id, target, style, pos }` (Standard 1 m hinter dem Bild auf `floor`), `floor`, `content`, `id` | `{ kind: 'bilderrahmen', pos: [8,1.05,-105.5], size: [1.6,2], warp: { id: 'bw', target: [60,1.2,-108] } }` (Wand mit Lücke + Rückwand baut der Level) |
| `drehraum` | quadratischer Raum dreht sich in Vierteldrehungen um die Längsachse (Boden → Wand); Einbauten drehen mit (während der Drehung nicht fest, danach an neuer Lage); vorn offen | `id`, `pos` (Bodenmitte), `size` [s, länge] ([12,16]), `parts: [{ pos: [x,y] (Querschnitt, Mitte unten), size: [w,h], z, color }]`, `period` 4, `turn` 1.4, `dir` 1, `auto` true (Takt, sobald eine Figur drin ist), `back`, `wall` → `{ quarter, turning, turns, angle, turnNow(), start/stop/toggle }` | `{ type: 'drehraum', id: 'dreh', pos: [60,1,-110], size: [10,12], parts: [{ pos: [-2.5,0], size: [3,1.2] }] }` |
| `zielmast_spuk` | falscher Zielmast: Berührung → „Reingelegt!“, Spukgesicht, Spuk erscheint (spawn), Mast verblasst (1,2 s) | `pos`, `height` 6, `text`, `spawn` ({ kind: 'spuk' }, falls vorhanden; false = keiner), `onTrick`, `id` | `{ kind: 'zielmast_spuk', pos: [-5,1,-122] }` |
| `spuk_tuer` | Flügeltür (2,2 × 3 m) mit Durchgang wie `tuer` + Raumwechsel: Stimmung `mood` nach dem Durchgang | Felder von `tuer` (`id`, `pos`, `yaw`, `target`, `auto`, `locked`, `key`, `onEnter` …), `mood` ('aussen'\|'innen'\|null) | `{ kind: 'spuk_tuer', id: 'a', pos: [6,1,-128], target: 'b', mood: 'aussen' }` |
| `lagune` | Wasserbecken mit Namen und änderbarem Stand (setLevel → Motor `level.setWaterLevel`), türkiser Körper, Oberfläche, Sandboden mit Lichtflecken | `id`, `pos` (Beckenboden), `size` [w, Tiefe, d], `bed` 1, `color`, `deep`, `caustics` 0.4, `current` [x,y,z], `rise` { to, speed, auto } | `{ type: 'lagune', id: 'see', pos: [0,-3.4,-166], size: [16,2.8,36] }` |
| `wasserschalter` | Draufspringen/Stampfen → Aktion `water` + `onPress`; `toggle` stellt zurück, `back` s → Wasser sinkt | `pos`, `water: { id, y \| dy, speed }` (auch Liste), `onPress`, `toggle`, `back`, `id`; Laufzeit `pressed`, `presses` | `{ kind: 'wasserschalter', pos: [10.5,1,-158], water: { id: 'see', y: 0.9 } }` |
| `holzsteg` | Deck schwimmt auf (folgt dem Wasser darunter, `float` m darüber) zwischen Grundlage und `hub`; ohne Wasser per Signal | `pos` (Anfang, Pfahlfuß), `yaw` 0, `length` 5, `width` 2, `hub` 2, `float` 0.1, `water` true, `speed` 2, `id` → `{ lift, deckY, open/close }` | `{ type: 'holzsteg', pos: [-6,-1.8,-172], length: 6, hub: 2.2 }` |
| `steg` | fester Holzsteg auf Pfählen (Deck auf y + height) | `pos`, `yaw`, `length` 4, `width` 2, `height` 1.2 | `{ type: 'steg', pos: [-8,-0.6,-152], length: 5, height: 1.6 }` |
| `rohrnetz` | Glasröhre mit Wasserfüllung und Blasen (Fahrt/Gabelung/Kanone/Münzen wie `glasspipe`) | Felder von `glasspipe` + `water` true, `waterColor` | `{ type: 'rohrnetz', path: [[4,1.6,-145],[4,1.6,-150],[4,-1.8,-156],[4,-1.8,-176],[4,2.2,-181]], coins: 4, branches: [{ at: 3, path: [[-3,-1.8,-176]] }] }` |
| `rohrteile` | grüne Röhrenstücke (Modell 'rohrnetz') mit Quader-Kollision | `items: [{ kind: 'gerade'\|'bogen'\|'t'\|'kreuz'\|'ende', pos, yaw, length, radius, color }]`, `solid` | `{ type: 'rohrteile', items: [{ kind: 't', pos: [0,0,-20] }] }` |
| `koralle` / `seetang` / `blasen` / `schiffswrack` | Unterwasser-Kulisse (Koralle/Seetang wiegen sich, Blasen steigen) | Koralle `kind` 'ast'\|'faecher'\|'hirn', `scale`, `sway`, `solid`; Seetang `height`, `count`, `current`; Blasen `height`, `count`; Wrack `size`, `yaw`, `shadow` | `{ type: 'seetang', pos: [6.5,-3.4,-164] }` |
| `wandriss` | rissige Wand: nur Kanonenkugel/Bombe/Riesentrank (`breakable: 'pound'`: auch Stampfen von oben) | `pos`, `size` [3,3,1], `breakable` 'cannon'\|'pound', `onBreak`, `color`, `id` | `{ kind: 'wandriss', pos: [-6,1,-188], onBreak: { reveal: 'goldroehre' } }` |
| `boost_rampe` | Boost-Schräge: Rampe (steigt nach lokal +X) mit Boost-Fläche | `pos` (Fußkante), `yaw` π/2, `length` 2.5, `width` 1.6, `height` 0.8, `speed` 18 | `{ type: 'boost_rampe', pos: [7,1,-197], length: 3, height: 1 }` |
| `boost_tor` | Bogen über der Fahrbahn, Durchlaufen beschleunigt | `pos`, `yaw` π/2, `width` 4, `speed` 18, `depth` 2 | `{ type: 'boost_tor', pos: [0,1,-199] }` |
| `sprungfeld` | Betreten schleudert in hohem Bogen **genau** auf `to` (Fußpunkt) | `pos`, `to` \| `dir` + `dist` 7, `arc` 3, `size` 1.6, `onLaunch`, `id` → `{ launches }` | `{ type: 'sprungfeld', pos: [0,1,-204.5], to: [0,1,-215] }` |
| `pilztrampolin` | Pilz-Hut federt (Flag bounce) | `pos`, `strength` 19, `scale` 1 | `{ type: 'pilztrampolin', pos: [-6,1,-220] }` |
| `bande` | Kart-Bande entlang einer Polylinie (fest) | `path` \| `from`/`to`, `solid` | `{ type: 'bande', path: [[12,1,-192],[12,1,-206]] }` |
| `start_bogen` | Start-/Zielbogen, Ampel grün nach `delay` bzw. beim Durchlaufen | `pos`, `yaw` π/2, `width` 8, `delay` 2, `mode` 'time'\|'pass', `id` → `{ go }` | `{ type: 'start_bogen', pos: [0,1,-194], mode: 'pass' }` |
| `rutschhang` | Rampe mit Flag slide: Figur rutscht ohne Ducken bergab | `pos`, `size` [w,h,d], `axis` 'z', `dir` −1, `low` 0, `slope` 0.85, `top` | `{ type: 'rutschhang', pos: [0,-3,-236], size: [10,4,16], dir: 1 }` |
| `kettenbahn` | sichtbare Bahn (Stahlträger, Laufrollen) unter dem Pfad einer Motor-`kettenplattform`/eines `kettenzaun` (nur Optik) | `path` (gleiche Punkte wie die Plattform), `loop` false, `drop` 0.55, `color` | `{ type: 'kettenplattform', id: 'kp', path: [[0,-3.35,-264],[0,-3.35,-282]], size: [4,3] }` + `{ type: 'kettenbahn', path: [[0,-3.35,-264],[0,-3.35,-282]] }` |
| `kurbelrad` | Angriffe (je ≈ 0,4 Umdrehungen) bzw. Laufen daneben drehen es; `turns` Umdrehungen heben die Plattform um `rise`, ohne Drehen sinkt sie | `pos`, `yaw`, `turns` 2, `platform: { pos, size, rise 4, color }`, `back` 0.4, `range` 1.6, `onFull`, `id`; Laufzeit `angle`, `k`, `platformY` | `{ kind: 'kurbelrad', pos: [-8,-3,-250], platform: { pos: [-11.5,-3,-254], rise: 4 } }` |
| `broeckelblock` | 1-m-Blöcke zerbröseln nach Betreten, kommen wieder | `pos` \| `blocks` \| `from`/`to` (Reihe), `delay` 0.5, `respawn` 5, `id` → `{ blocks: [{ state }], left() }` | `{ type: 'broeckelblock', from: [5,-3,-248], to: [8,-3,-248] }` |
| `wolkenlift` | unsichtbar (begehbar, von unten durchspringbar), erscheint bei Berührung/Nähe, fährt dann den Pfad (Lift) | `pos`, `width` 2.6, `path`, `speed` 2, `reveal` 'touch'\|'near'\|'visible', `near` 3, `wait` 0.5, `loop`, `onReveal`, `id` → `{ shown, state, reveal() }` | `{ type: 'wolkenlift', pos: [-6,-3,-290], path: [[-6,2,-290]] }` |
| `goldring` | Durchlaufen/-springen → Münzen (5) bzw. `reward` | `pos` (Ring-Mitte), `yaw` π/2, `radius` 1.1, `coins` 5, `reward`, `id` | `{ kind: 'goldring', pos: [0,-1.75,-257], radius: 1.2 }` |
| `schneeblock` / `eisblock` | 1-m-Blöcke (Instanzen): Kopfstoß, Feuer, Tatze, Stampfen von oben … zerbrechen sie, Inhalt | `pos`, `content` 'none', `hits` 1, `id`, `hidden`; Reihen: `schneebloecke` (`kind`, `grid`, `blocks`, `contents: { 'i,j,k' }`) | `{ type: 'schneebloecke', kind: 'schneeblock', pos: [-5,3.2,-10], grid: [3,1,1], contents: { 1: 'coin' } }` |
| `eiszapfen` | hängt (pos = Aufhängung), Figur darunter → zittert, fällt, verletzt, wächst nach | `pos`, `length` 1, `r` 0.9, `range` 9, `delay` 0.5, `respawn` 3, `id` | `{ kind: 'eiszapfen', pos: [7,5.5,-14] }` |
| `schneehaufen` | Münzen versteckt: Stampfen/Tatze/Feuer/Hineinrutschen zerstieben ihn | `pos`, `size` 1.6, `coins` 5 \| `content`, `id` | `{ kind: 'schneehaufen', pos: [-8,1,-20] }` |
| `tanne` | schüttelt Schnee ab (Hineinrennen ≥ 5 m/s, Angriff, Stampfen daneben), Inhalt fällt einmal | `pos`, `size` 3.5, `content`, `solid`, `yaw`, `id` | `{ kind: 'tanne', pos: [-3,1,-20], content: 'coins:3' }` |
| `eisflaeche` | Motor-`eisbahn` (Flag ice) auf einem Sockel, Schneewulst-Kanten | `pos`, `size` [w,h,d] ([8,1,8]), `body` 'snow'\|'rock'\|'none', `edge`, `under`, `model`, `snow` | `{ type: 'eisflaeche', pos: [6,1,-27], size: [8,0.2,10], edge: true }` |
| `iglu` | Iglu (Kuppel begehbar) | `pos`, `size` 3.4, `yaw`, `solid` | `{ type: 'iglu', pos: [-8,1,-2] }` |
| `bahnsteig` / `parallelgleis` | Bahnsteig mit Kante, Dach, Lampen, Bank, Schild / zweites Gleis (wie `track`) versetzt | Bahnsteig `pos`, `size` [5,1.1,24], `edge` 'right'\|'left', `roof`, `sign`, `lamps`; Parallelgleis `path`, `offset` 8 (rechts +), `dy`, Felder von `track` | `{ type: 'parallelgleis', path: [[-14,-3,-302],[-14,-3,-358]], offset: -5.5 }` |
| `zirkuszelt` / `manege` / `zirkuspodest` | Arena-Hülle (Wand optional fest, Eingangslücke), Manegenring (fest), Trommel-Podest (fest) | Zelt `radius` 12.5, `height` 12, `walls`, `door` −π/2, `doorWidth` 4; Manege `radius` 4, `floor`, `solid`; Podest `radius` 1.2, `height` 0.9 | `{ type: 'zirkuszelt', pos: [0,0,-30] }` |
| `seilbahn` | Gondel zwischen zwei Seilpunkten (Boden 2,2 m unter dem Seil), fährt mit Figur los, am Ziel erst aussteigen | `from`, `to`, `speed` 3, `wait` 1.5, `trigger` 'stand'\|'auto', `mode` 'pingpong'\|'once', `masts`, `id` → `{ u, state, floorY }` | `{ type: 'seilbahn', from: [4,-0.7,-338], to: [4,3.2,-352] }` |
| `rosa_gras` / `bunter_stein` / `pastell_blume` / `hecken_hase` | Pastell-Blöcke (fest, `ice` möglich), Blumen (Kulisse, `sway`), Formschnitt-Hase (fest) | Blöcke `pos`, `size` [2,1,2]; Blume `yaw`, `sway`, `scale`; Hase `yaw`, `scale`, `solid` | `{ type: 'bunter_stein', pos: [-4,-3,-346], size: [2,1.5,2] }` |
| `endlessblock` | Endlos-Münzblock (vorhanden, Sonder-Bausteine): Münzen, solange Treffer in `window` s folgen | `window` 1.2, `max` 40 | `{ kind: 'endlessblock', pos: [-2,-0.6,-355] }` |
| `deco_w3` | Kulisse (verschmolzen) | `items: [{ kind, pos, … }]`, Arten `tanne, tannen, schneemann, felsen, schneehuegel, schneeflaeche, iglu, laterne, laternen, herbstbaum, herbstbaeume, korallen, kerze, spinnweben`; `shadow: false` (je Eintrag oder für die Liste) | `{ type: 'deco_w3', shadow: false, items: [{ kind: 'tannen', pos: [-24,-3,-60], size: [10,110], n: 14 }] }` |

### Präzisierung (Bausteine Welt 3): Themen

| Thema | Stimmung | Kulisse (`buildBackdrop`) |
| --- | --- | --- |
| `snow` | klarer Wintertag, tiefe warme Sonne, blaues Bodenlicht (weiche blaue Schatten), Schneedecken, eisblau-grauer Fels; sparsamer Schneefall | verschneite Hügel/Berge (1 Mesh), Schneefall (1 Punkte-Objekt) |
| `skyway` | über den Wolken, tiefblauer Zenit, kräftige Sonne | Wolkenmeer mit Wolkenbergen tief unten (1 Mesh) |
| `ghost` | innen dunkles Violett, Kerzenlicht, Licht an der Figur, Laternen; Stimmung `aussen` = Nacht mit Mondlicht | Mond mit Schein, Sterne, kahle Bäume und Grabsteine (3 Meshes) |
| `plaza` | Pastell-Vormittag, rosa Gras, cremefarbene Erde | mintgrüne und fliederfarbene Hügel (1 Mesh) |
| `fortress` | tiefroter, rauchiger Abend, Lavaschein, Fackel-Licht; grauer Stein, roter Backstein | Lavasee tief unten, ferne Burgtürme mit glühenden Fenstern (2 Meshes) |
| `water` | tropische Lagune, helles Türkis, Sand; **Unterwasser-Stimmung** automatisch | Meer bis zum Horizont (spart den Level aus) mit Inseln (2 Meshes) |
| `race` | sonniger Alpentag | Berge mit Schneekappen, Wimpelmasten entlang der Strecke (2 Meshes) |
| `autumn` | goldener Herbstnachmittag, Herbstgras | rostrote Hügel, Wald in Orange/Rot/Gold, fallende Blätter (2 Meshes + 1 Punkte-Objekt) |
| `train` | Schneeebene am späten Nachmittag, Pfirsich-Horizont | Ebene, verschneite Tannenwälder, ferne Berge, leichter Schneefall |

`circus` (1-5) und `diorama` (1-Schatz) bleiben unverändert und gelten für 3-B bzw. 3-Kapitän. Die Winterwerkstatt lässt
sich mit `?course=0-13&theme=<name>` in jedem Thema ansehen.

### Präzisierung (Bausteine Welt 3): Welt 3 – Gimmick → Baustein

| Level | Gimmick laut Bauplan | Bausteine |
| --- | --- | --- |
| 3-1 | Schneelandschaft, Eisbahn, schmale Eisstege, Baumhain | `eisbahn`/`schneefeld` (Motor), `eisflaeche`, `island`/`platform` mit `ice`, `schneeblock`/`eisblock`/`schneebloecke`, `eiszapfen`, `schneehaufen`, `tanne`, `iglu`, `deco_w3` (Tannen, Schneemänner, Felsen, Laternen); Schneebälle/Schlittschuh vom Motor |
| 3-2 | Kettenzäune als Plattformen, Wände fahren, Bröckelblöcke, Goldringe, Kurbelrad hebt Plattform, Wolkenstrecke | Motor `kettenplattform`/`kettenzaun` + `kettenbahn`, `mover`/`vehicle` (style fence), `broeckelblock`, `goldring`, `kurbelrad`, `cloud`, Thema `skyway` |
| 3-3 | verschiebbare Treppen/Regale, Sofa-Lift, Gemälde mit Warp-Box → Drehraum, Kronleuchter, falscher Zielmast, Türen innen/außen | `spuk_treppe`, `buecherregal`, `spuk_sofa`, `bilderrahmen` + `warpbox`, `drehraum`, `kronleuchter`, `zielmast_spuk`, `spuk_tuer` (`mood`), `deco_w3` (Kerzen, Spinnweben), Thema `ghost` |
| 3-4 | unsichtbarer Wolkenlift hinter dem Start, Endlos-Münzblock, Pastell-Garten | `wolkenlift`, `endlessblock`, `rosa_gras`, `bunter_stein`, `pastell_blume`, `hecken_hase`, Thema `plaza` |
| 3-A | rot vergitterte Festung | Thema `fortress`, `arena_cage` (vorhanden) |
| 3-5 | Röhren-Netz, steigender Wasserspiegel, Wrackbucht, Wandriss mit Kanone → goldene Röhre | `rohrnetz`, `rohrteile`, `lagune` + `wasserschalter` (bzw. Aktion `water` im Level-Haken), `koralle`, `seetang`, `blasen`, `schiffswrack`, `wandriss` + `goldroehre`, Thema `water` (Unterwasser) |
| 3-6 | Boost-Pfeile/-Schrägen, Sprungfelder über 6–8 m Lücken, Pilztrampoline, Rutschhang, Sprungfeld zum Zielmast | `boost`, `boost_rampe`, `boost_tor`, `sprungfeld` (`to`), `pilztrampolin`, `bande`, `start_bogen`, `rutschhang`, `broeckelblock`, Thema `race` |
| 3-7 | Schalttafeln auf Schienen, Schaltblock kehrt um, Weichen (Tafel kippen), Diagonalschiene | `schiene` (Netz, beliebige Polylinien), `schalttafel`, `schaltblock`, `deco_w3` (herbstbaeume), Thema `autumn` |
| 3-Zug | Bahnsteig, Zugwaggons, Parallelzug | `vehicle` style `lok`/`wagen`/`flach`, `track`, `parallelgleis`, `bahnsteig`, Thema `train` |
| 3-B | Zirkuszelt-Arena, Treppe und Seilbahn | `zirkuszelt`, `manege`, `zirkuspodest`, `seilbahn`, `stairs`, Thema `circus` |
| 3-Kapitän | Wasserstand per Schalter, Holzsteg hebt sich, Glasröhren-Netz | `lagune` + `wasserschalter` + `holzsteg`, `rohrnetz`/`glasspipe` (Gabelungen), Thema `diorama` |

### Präzisierung (Bausteine Welt 3): Tests und Kennzahlen

`tests/course_w3_blocks.mjs` (`PORT_BASE=3900 node tests/course_w3_blocks.mjs`, Port 4350, vorher `npm run build`) lädt
`?course=0-13&scale=2&adapt=0` und prüft deterministisch (manuelle Schritte) je Baustein das Kernverhalten – 55 Prüfungen,
u. a.: Schnee-/Eisblock (Kopfstoß, Feuer), Eiszapfen (fällt, trifft, wächst nach), Schneehaufen (5 Münzen), Tanne
(schütteln), Eisfläche (Boden `eisbahn` mit `ice`, 0,25 s nach Loslassen noch ≈ 4,7 m/s), Schalttafel (fährt nur mit
Figur, Weiche links/rechts, Schaltblock kehrt um), Bücherregal (Schieben über `onPush` + Anlage, Tatze 1 m), Spuk-
Treppe/-Sofa, Kronleuchter, Gemälde → Warp → Drehraum, falscher Zielmast, Spuk-Tür, Wasserschalter → Lagune
(−0,6 → 0,9 über `level.setWaterLevel`) und Holzsteg, Röhren-Netz, Wandriss, Start-Bogen, Boost-Tor/-Schräge (18 m/s),
Sprungfeld (Landung genau auf `to`), Pilztrampolin, Rutschhang, Kurbelrad, Bröckelblock, Goldring, Motor-
Kettenplattform auf der `kettenbahn`, Wolkenlift, Zug-Oberkanten, Seilbahn, Endlos-Münzblock, `setUnderwater`
(erzwungen/auto), Ziel erreichbar; danach jedes Welt-3-Thema mit `?theme=` (Bilder `tests/out/w3b_thema_*.png`),
Stimmung `aussen` im Thema ghost und automatisches Abtauchen im Thema water (`w3b_unterwasser.png`).

Kennzahlen (SwiftShader, 960 × 540, Szenen-Bilder der Werkstatt; Zeichenaufrufe / Dreiecke):

| Bild | Aufrufe | Dreiecke | | Thema (`?theme=`) | Aufrufe | Dreiecke |
| --- | --- | --- | --- | --- | --- | --- |
| start | 78 | 205 k | | snow | 111 | 326 k |
| schnee | 84 | 227 k | | skyway | 95 | 212 k |
| eis | 89 | 222 k | | ghost | 134 | 292 k |
| schienen | 87 | 220 k | | plaza | 92 | 196 k |
| regal | 86 | 178 k | | fortress | 111 | 303 k |
| sofa | 101 | 157 k | | water | 132 | 285 k |
| gemaelde | 97 | 153 k | | race | 121 | 245 k |
| drehraum | 70 | 107 k | | autumn | 113 | 355 k |
| lagune | 93 | 204 k | | train | 88 | 232 k |
| rennen | 78 | 126 k | | circus | 75 | 159 k |
| himmel | 89 | 175 k | | diorama | 102 | 299 k |
| wolkenlift / zug / zirkus | 91 / 90 / 85 | 216 k / 221 k / 152 k | | | | |

Budget eingehalten (< 140 Aufrufe, < 400 k Dreiecke); keine Konsolenfehler/-warnungen. Regression: `course_w3engine`
66/66, `course_w2_blocks` 50/50, `course_blocks` 62/62, `course` 46/46 (die Prüfung „Ergebnis-Szene sichtbar“ wartet
15 s Wanduhr und kann unter Last ausfallen; Wiederholung grün).

## Präzisierung (Gegner Welt 3)

Ergänzung des Gegner-Agenten Welt 3 (Stand: Gegnerzoo Schnee `0-10`, Schattenläuferin-Arena `0-11`, Zirkus des
Schlangenkönigs `0-12`). Nichts oben Festgelegtes wird geändert. Level-Bauer schreiben nur Daten; alle Felder sind
optional, sofern nicht anders vermerkt. Gemeinsame Felder und Konter aus „Präzisierung (Gegner/Power-ups)“ und
„Präzisierung (Gegner Welt 2)“ gelten weiter (`id, pos, dir|yaw, path, loop, wake, edges, drop`; Ziel = nächste Figur,
Lava/Absturz = besiegt, `STRONG` = cannon, bomb, mega, star).

### Präzisierung (Gegner Welt 3): Dateien

```
src/course/entities/EnemyW2.js              + looksAt(level, fig, pos, deg) (level.isFacing des Motors, sonst fig.yaw),
                                              waterAt(level, x, y, z, below) → { shape, top, bottom } (folgt dem Wasserspiegel)
src/course/entities/kinds/  schneesaeule · pilzling_w3 (pilzling_eis, pilzling_reifen) · spuk (spuk, kreisgeist,
                            kreisgeist_kreis + intern kreisgeist_glied) · funken_w3 (funkenlaeufer, funkenkaefer) ·
                            huepfqualle · riesenprojektil (+ riesenkanone) · fische_w3 (flossling, stachelfisch, rammfisch) ·
                            schattenlaeuferin (+ schatten_doppelgaenger, schatten_bumerang) · schlangenkoenig
                            (+ dienerschlange, felsbrocken); kanone_turm: shot 'riesenprojektil'
src/course/levels/w0/0-10.js                Gegnerzoo Schnee (8 Gehege, Spukraum, Wasserbecken 'becken' mit Steg und Stachelwand, Z(r, dz))
src/course/levels/w0/0-11.js                Schattenläuferin-Arena (Archetyp boss, Käfig r 9, Warp-Box → Ziel)
src/course/levels/w0/0-12.js                Schlangenkönig im Zirkus (Archetyp boss, Käfig r 11,5 ohne Decke, Manege, Stern + Warp-Box)
tests/course_w3_enemies.mjs                 Port 4231: Verhalten/Konter/Schaden je Gegner, Klone, beide Bosse, Bilder w3en_*.png
```

### Präzisierung (Gegner Welt 3): gemeinsame Regeln

- **Angriffsarten:** Feuer, Wurf (`throw`, auch der rollende Schneeball), Biss, Stampfwelle (`pound`, auch die landende
  Statue), Rutschen (`slide`), Kanonenkugel, Krallen, Panzer, Explosion, Riesentrank, Funkelstern wie in Welt 2; der
  **Schwanzhieb** des Gleitblatts kommt als `claw` (`source.attackInfo.style === 'tail'`), der Zaun-Faustschlag als `punch`.
  **Unbekannte Arten** wirken wie ein normaler Treffer. Stampfen auf Reit-Oberseiten ruft `onPound(figur)` (Player.land).
- **Licht** (`onLight(dt, figur)`, Licht-Helm) wirkt nur auf Geister (Spuk, Kreisgeist); andere Gegner ignorieren es.
- **Blick:** Spuke fragen `level.isFacing(figur, punkt, look)` (Motor; ohne ihn Rückfall über `figur.yaw`). Eine **Statue**
  (Gleitblatt) ist für alle Gegner unsichtbar (Skript-Modus): Spuke folgen ihr nicht.
- **Eis:** Gegner mit `moveWithGravity` rutschen auf Eis automatisch (Motor, `entities/ice.js`); der Eisläufer-Pilzling hat
  eigene Gleitphysik (`noIce`).
- **Wasser:** Reifen-Pilzling, Stachelfisch (Oberfläche) folgen dem aktuellen Wasserspiegel (jede Abfrage liest die Form,
  auch während `level.setWaterLevel(id, y, speed)`) und bleiben im Wasser vor Hindernissen in der Wasserlinie (Steg, Mauer);
  Flossling/Rammfisch schwimmen nur, wo Wasser ist (Flossling auf dem Trockenen: zappelt). Schwimmende und getauchte Figuren
  werden normal getroffen.
- **Schlittschuh:** Der Eisläufer erzeugt beim Besiegen (Draufspringen/Stampfen) die Motor-Entität `schlittschuh` an seiner
  Stelle (`skateDrop: 'schlittschuh'`; verloren → nach 4 s wieder dort); ohne Motor-Entität 3 Münzen (`'fehlt'`).
- **Bosse** (Schattenläuferin, Schlangenkönig) sind kein `enemy` (Stern/Riese wirken nicht), Schnittstelle wie Wirbelbrocken
  (`begin, reset, state, stateT, hp, maxHp, phase, visible, home, half, carHits 0, info()`, `level.onBossHit`,
  `level.onBossDefeated`) und setzen eigene Phasen-Ansagen (`arch.seenPhase`).

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| schneesaeule | wandert/folgt; Segmente (3–5) | je Treffer **ein Segment** (unterstes zuerst, Kopf zuletzt): Draufspringen (Abprall), Stampfen, Krallen, Panzer, Wurf, Rutschen, Schwanzhieb …; **Feuer schmilzt** die ganze Säule, STRONG ebenso | seitlich (Stacheln) |
| pilzling_eis | gleitet schnell in Bögen auf Eis (Kreis/Oval, Bahn, Slalom, Verfolger), daneben langsam | Draufspringen → platt + **Schlittschuh**; `ride`: man fährt oben mit, Stampfen besiegt (+ Schlittschuh); alle Angriffe | seitlich |
| pilzling_reifen | treibt im Schwimmreifen, paddelt zur Figur (nur im Wasser) | Draufspringen, alle Angriffe | seitlich, schwimmend |
| spuk / Großspuk (`size`) | folgt nur, wenn die Figur **wegschaut**; angesehen: versteckt sich (shy), steht still | **Licht-Helm** (0,8 s / 2,2 s Licht), Stern, Riese | jede Berührung (auch von oben) |
| kreisgeist (+ Ring) | kreist (Ring aus count Gliedern, Bahn, Kreis) | **Licht** (0,6 s, einzeln), Stern, Riese | jede Berührung |
| funkenlaeufer | saust an Blockkanten/Schienen/Kreis entlang, unverwundbar | nur Stern, Riese | jede Berührung |
| funkenkaefer | fliegt; lädt auf (0,6 s) und stürzt sich auf die Figur | Draufspringen, alle Angriffe | seitlich, Sturzflug |
| huepfqualle | hüpft im Takt (Level-Uhr), auf der Stelle/Bahn/zur Figur | Draufspringen, alle Angriffe | seitlich |
| riesenprojektil | großes, langsames Geschoss; **Oberseite begehbar** (mitfahren, abspringen) | Stampfen auf der Oberseite, Kanone, Bombe, Riese, Stern | vorn/seitlich |
| riesenkanone | feuert Riesenprojektile im Takt (auch unsichtbar am Bildrand) | Kanone, Bombe, Riese (sichtbar) | – |
| flossling | Schwarm auf Bahn unter Wasser; `jump`: springt im Takt aus dem Wasser | Draufspringen (aus dem Wasser), alle Angriffe; an Land harmlos (zappelt) | Berührung |
| stachelfisch | verfolgt an der Oberfläche; `wall`: schießt im Takt aus Wandlöchern | nur STRONG | jede Berührung (auch oben) |
| rammfisch | patrouilliert, dreht sich zur Figur, rammt (steigt auf ihre Höhe), betäubt, dreht um | nur STRONG | Berührung (betäubt harmlos) |

### Präzisierung (Gegner Welt 3): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Schneesäule: segments 3–5 (4, Kopf mitgezählt), behavior 'walk'|'chase', speed 0.9, chaseSpeed 1.4, sight 8, path, dir
  { kind: 'schneesaeule', pos: [0, 1, -20], segments: 5, behavior: 'chase', sight: 6 },
  // Eisläufer: path (Runde) | center + radius 4 (+ rz Oval, cw) | dir (Slalom: slalom 1.2 rad); speed 4.2 (Eis), walk 1.4,
  //   turn 2.2 rad/s, behavior 'skate'|'chase', sight 9, ride false (Oberseite zum Mitfahren), skate 'stomp'|'always'|false
  { kind: 'pilzling_eis', pos: [4, 1.1, -30], center: [0, 1.1, -30], radius: 4.5 },
  { kind: 'pilzling_eis', pos: [0, 1.1, -27.5], center: [0, 1.1, -30], radius: 2.5, ride: true, speed: 2.6 },
  // Reifen-Pilzling: pos.y = Wasseroberfläche; speed 1.6, sight 8, path (treibt ohne Figur)
  { kind: 'pilzling_reifen', pos: [-8, 0.8, -40] },
  // Spuk: pos = Unterkante; size 1 (Großspuk 2.5), speed 1.5 (0.9), look 70°, sight 14, hover 0.45, fade 0.8 (2.2), shyDelay 0.15
  { kind: 'spuk', pos: [-6, 1.4, -50] }, { kind: 'spuk', pos: [6, 1, -52], size: 2.5 },
  // Kreisgeist einzeln: center + radius 3 | path | pos; speed 1.6 m/s, cw, phase, fade 0.6
  { kind: 'kreisgeist', center: [0, 1.25, -60], radius: 5.6, cw: true },
  // Kreisgeist-Ring: pos = Mitte (Unterkante), count 8 (≤ 40), radius 3, speed 1.6 m/s am Umfang, cw, phase, fade 0.6, peek 2.5
  //   Glieder: level.named `${id}_${i}` (kind 'kreisgeist_glied'); Ring-Laufzeit: angle, mask, aliveCount, members
  { kind: 'kreisgeist_kreis', id: 'ring', pos: [0, 1.25, -60], count: 10, radius: 4, speed: 2 },
  // Funkenläufer: path|rail (Runde ab 3 Punkten) | block: { pos, size } (Rand der Oberseite) | center + radius; speed 3,
  //   count 1, spacing 2, phase, wait 0, cw
  { kind: 'funkenlaeufer', block: { pos: [-4, 1, -70], size: [3, 1.2, 3] }, speed: 2.6 },
  // Funkenkäfer: pos | path (y = Flughöhe) | center + radius; speed 2.2, sight 6, dive 8.5, charge 0.6, cooldown 2.0
  { kind: 'funkenkaefer', pos: [4, 4, -72] },
  // Hüpfqualle: period 1.2 s (Takt der Level-Uhr), phase 0..1, height 1.4, hop 0 (mit dir/path 1.2), behavior 'hop'|'chase', sight 7
  { kind: 'huepfqualle', pos: [0, 2.4, -80], period: 1.0, behavior: 'chase' },
  // Riesenprojektil: pos = Mitte der Unterkante (Rumpfmitte y + 1,2), dir, speed 3.5, life 14, ride true
  { kind: 'riesenprojektil', pos: [-20, 2, -90], dir: [1, 0] },
  // Riesenkanone: height 2.6 (Rohrmitte), interval 5, first 1.5, range 40, charge 0.8, max 2, speed/life/ride, hidden, active;
  //   setActive(b). Alternativ kanone_turm mit shot: 'riesenprojektil'.
  { kind: 'riesenkanone', id: 'rk', pos: [18, 1, -95], dir: [-1, 0], hidden: true, interval: 6 },
  // Flossling: mode 'swim' (path | center + radius, count, spacing 1.2, behavior 'swim'|'chase', sight 5) |
  //   'jump' (every 2.4 s, height 2.6, dist 4 in dir, pendelt; count → nebeneinander); speed 2.2, phase, color tuerkis|koralle|gold
  { kind: 'flossling', path: [[6, -0.9, -100], [16, -0.9, -100], [16, -0.9, -105]], count: 4 },
  { kind: 'flossling', mode: 'jump', pos: [-2.2, 0, -110], dir: [1, 0], dist: 4.4, height: 2.4 },
  // Stachelfisch: mode 'surface' (Standard; sight 9, speed 2.2) | 'swim' (path) | 'wall' (pos = Lochmitte, dir = Schussrichtung,
  //   period 2.4, phase = Vorlauf im Takt, reach 3.5, shoot 9, back 4, out 0.35, size 0.45)
  { kind: 'stachelfisch', pos: [9, 0, -112] },
  { kind: 'stachelfisch', mode: 'wall', pos: [17.95, 0.2, -114], dir: [-1, 0], period: 2.4, phase: 0.33 },
  // Rammfisch: pos = Unterkante (Schwimmhöhe), path | dir, speed 1.4, charge 7, sight 8 (Kegel ±35°), range 12, stun 1.3
  { kind: 'rammfisch', pos: [-15, -1.1, -116], path: [[-17, -1.1, -116], [-6, -1.1, -116]] },
],
```

### Präzisierung (Gegner Welt 3): Bosse

**Schattenläuferin** (3-Zug, Arena am Zugende; Archetyp `boss`, im Zug mit `scroll.with: 'boss'`):

```js
{ kind: 'schattenlaeuferin', id: 'schatten', pos: [0, 2, -3.5], arena: { center: [0, 2, 0], r: 8.6 }, ring: 5, hp: 3,
  clones: [2, 3, 5], throws: [2, 2, 3], boomerang: { speed: 7.5, range: 9 }, wakeR: 8, seed: 7 }
boss: { id: 'schatten', name: 'Schattenläuferin', speed: 0, trigger, warp: 'warp_sieg', frame: 0.3 }
```

Ablauf: `wait` → `intro` (2 s, erscheint im Rauch) → ein Wurf → `teleport` (0,35 s) → `hidden` (0,5 s) → `appear` (0,8 s):
sie steht auf einem von N+1 Plätzen eines Rings (r `ring`) um die Arenamitte, die **Doppelgänger** (2 / 3 / 5 je Phase)
auf den übrigen; dann je Erscheinen `throws` Würfe, dazwischen `run` (alle huschen 60° weiter) → wieder `teleport` …
**Wurfsterne** (`schatten_bumerang`) fliegen im Bogen zur nächsten Figur und zurück in die Pfote; es werfen das Original und
die ersten `phase` Doppelgänger (2 / 3 / 4 Wurfsterne). **Nur das Original** (pinke Schleife, Modell `clone: false`) zählt:
Draufspringen/Stampfen bzw. Kanonenkugel → `hit` (0,6 s), alle Doppelgänger lösen sich in Rauch auf, Teleport, nächste
Phase. Doppelgänger: Draufspringen → Rauch (Abprall), jeder Angriff ebenso; seitliche Berührung verletzt. 3 Treffer →
`defeated` (2,2 s) → `flee` (0,8 s) → `gone`. Laufzeit: `clones`, `cloneLog` (z. B. [2, 3, 5]), `boomerangs`, `vulnerable`.

**Schlangenkönig** (3-B, Zirkuszelt-Arena; Archetyp `boss`):

```js
{ kind: 'schlangenkoenig', id: 'koenig', pos: [0, 2, 0] (Sockelmitte), arena: { center: [0, 2, 0], r: 11 }, hp: 3,
  plate: 2.8, spots: [[x, z], …] (Standard 6 auf Ring r 6), segments: 14, claw: true, star: { pos: [0, 2.4, 6.5], index: 0 } }
boss: { id: 'koenig', name: 'Schlangenkönig', speed: 0, trigger, warp: 'warp_sieg', frame: 0.25 }   // Arena ohne Decke (ceiling 0)!
```

Sockel: fester Zylinder (r 2,4, 1,4 m), wer daraufspringt, wird ohne Schaden heruntergeschubst. Ablauf: `wait` → `rise`
(1 s, bricht aus dem Sockel) → `roar` → Runde: `throw` (2 / 3 / 4 Felsbrocken im Bogen auf die Figur, Landeanzeige; Aufprall
verletzt im Umkreis 1 m) → `summon` (Diener: 3 / 3 / 4, rissig 0 / 1 / 2; jeder zweite Ruf: Krallen-Anzug auf einem heilen
Teller) → `lean` (Fenster 7 / 6,5 / 6 s): Kopfmitte `plate + 2,7 m` über dem Teller nahe der Figur – vom Boden aus
unerreichbar, **vom Teller aus draufspringen = Treffer**; ab Phase 2 fallen Steine von der Kuppel (alle 2,6 / 2,0 s,
abwechselnd auf die Figur und auf einen Teller) → Treffer: `hit` → Diener versinken → `retreat` → nächste Runde; Fenster
um: `strike` (Stoß nach der Figur, verletzt) → `gap` → nächste Runde. Kopf von unten/seitlich: harmlos (außer im Stoß).
3 Treffer → `defeated` (2,5 s, Krone fällt) → `sink` → `gone`; `star` erscheint. Diener (`dienerschlange`, auch einzeln:
`{ kind, pos, height 2.8, cracked, claw, up true }`): Teller = Einweg-Zylinder r 0,72 auf `height`, Körper = Kletter-Säule
(Krallen-Anzug); rissiger Teller bricht 0,45 s nach dem Betreten, Steine zerschlagen Teller (`brokenBy 'step'|'rock'`).

### Präzisierung (Gegner Welt 3): Tests und Kennzahlen

`tests/course_w3_enemies.mjs` (Port 4231, `?course=0-10|0-11|0-12&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`;
Hilfen `window.__t`: `Z(r, dz)`, `place`, `stomp`, `side`, `touch`, `face`, `safe`, `count`, Bosse zusätzlich `enter`, `until`,
`untilSafe`, `plateJump`, `plate`): je Gegner Kernverhalten, Besiegen-Weg und Schadensweg – Schneesäule verliert Segmente (Kopf
zuletzt, Feuer schmilzt, echter Schwanzhieb des Gleitblatts), Eisläufer auf Eis (Bögen, Slalom, Verfolger, Schlittschuh des
Motors zum Anziehen, Mitfahren + Stampfen), Spuk folgt nur bei abgewandtem Blick (shy beim Hinsehen, Statue unsichtbar),
Licht-Helm löst Spuk (0,8 s) und Großspuk (2,2 s) auf, Kreisgeist-Ring (Drehung, Licht
löst einzelne Glieder, Maske), Funkenläufer am Blockrand, Funkenkäfer-Sturzflug, Hüpfquallen im Takt (Versatz), Riesenkanone im
Takt, Riesenprojektil (Mitfahren, Abspringen, Stampfen), Reifen-Pilzling (paddelt, bleibt vor dem Steg), Flossling-Schwarm und
Sprung-Flossling, Stachelfisch an der Oberfläche, Stachelwand im Takt (2,4 s, Versatz), Rammfisch, steigender Wasserspiegel
(`setWaterLevel`: Reifen-Pilzling und Stachelfisch treiben oben mit); Klone (Reifen-Pilzling,
Funkenkäfer, Hüpfqualle, beide Bosse zielen auf die nächste Figur); Schattenläuferin (Bumerang hin und zurück, Doppelgänger
2/3/5, nur das Original trifft, Salven, Ansagen, Sieg → Warp → Ziel, Tod setzt zurück); Schlangenkönig (Auftritt, Steine mit
Landeanzeige, Diener mit Tellern auf 2,8 m, vom Boden unerreichbar, Teller-Weg = Treffer, rissiger Teller bricht, Krallen-Anzug
und Kletter-Säule, Steinregen zerschlägt Teller, Stoß verletzt, Phase 3 mit 4 Dienern, Sieg → Stern + Warp → Ziel, Sockel
schubst, Tod setzt zurück) – 88 Prüfungen. Bilder `tests/out/w3en_*.png`. Gemessen (scale 2, inkl. Schattenpass, Themen
snow/train/circus): Gegnerzoo Schnee 61–100 Zeichenaufrufe, ≤ 212 k Dreiecke; Schattenläuferin 69–122 (mit 5 Doppelgängern;
Doppelgänger werfen keinen Sonnenschatten); Schlangenkönig 54–99. Simulation: ein Schritt im Zoo (≈ 50 Entitäten) ≈ 0,15 ms.
Hinweis für Level-Bauer: Kreisgeist-Glieder und alle Gegner haben einen Schatten-Blob (höchstens 96 je Bild sichtbar).

## Welt 4 – Level-Liste und Freischaltung (Hauptsitzung)

Welt 4 „Canyon-Inselkette“ wird nach Sieg über `3-Zug` frei (Glasröhre am Ende der Welt-3-Insel, bisher „Bald“).
Sternbedarf zählt **alle** gesammelten Sterne (Welt 1–3 bieten zusammen 79).

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `4-1` | parcours (Canyon, Ameisensoldaten an Wänden, Stachelfeld) | canyon | course_canyon | 3 + Stempel | Welt 4 offen |
| `4-2` | parcours (Giftwasser-Wald, Rankenschnapper; Welt-Warp nach Welt 5) | poison | course_poison | 3 + Stempel | 4-1 |
| `4-A` | arena (Felsinsel in Lava, Lavabrocken) | lava | course_arena | 1 | 4-2 |
| `4-3` | parcours (Piep-Blöcke im Musiktakt, Klone) | beep | course_beep | 3 + Stempel | 4-2 **und ≥ 60 Sterne** |
| `4-Haus` | house (Prüfungs-Haus, 10 Räume à 10 s) | house | course_house | 10 | 4-3 **und ≥ 70 Sterne** |
| `4-4` | parcours (Trampoline, Riesentrampolin-Fahrt, Flatterkäfer-Räder) | bounce | course_bounce | 3 + Stempel | 4-3 |
| `4-5` | parcours (Ruinenstadt, Walzenwerfer, Stachelstangen) | ruins | course_ruins | 3 + Stempel | 4-4 |
| `4-B` | arena (blau vergitterte Werfer-Festung, 3 Feuer-Werfer, 100 s) | fortress | course_arena | 1 | 4-5 |
| `4-Burg` | parcours + boss (Lava-Burg, Lavafelsen-König) | lavacastle | course_lavacastle | 3 + Stempel | 4-5 **und ≥ 80 Sterne** |

Welt 4 hat 30 Sterne. Neu: **Piep-Blöcke** (erscheinen/verschwinden im Takt der Musik – Taktuhr `music.beat()`/
`onBeat`, `themeInfo('course_beep').sync`), Riesentrampolin, Stachelstangen, Roulette-Block, Giftwasser (tödlich),
Sternring mit Sternmünzen. Gegner: Ameisensoldat, Hörner-Ameisensoldat, Riesenameise (laufen an Wänden, tragen die
Figur), Rankenschnapper (wachsen über den Weg), Lavabrocken (tragbar, werfbar), Walzenwerfer (wirft Stachelwalzen),
Stachelpanzer, Springklotz, Lavafunke; Boss **Lavafelsen-König** (nur geworfene Lavabrocken treffen). „Mitspieler“
im Bauplan = Klone der Spiegelfrucht. Die Welt-Warp-Röhre in 4-2 führt zur Welt-5-Insel („Bald“, bis es sie gibt).

**Level-Notizen 4-3 / 4-4** (Level-Agent; Hilfen `src/course/levels/w4/_helpers_b.js` ohne `LEVEL`; Test
`tests/course_w4b.mjs [4-3|4-4] [a|b|c]` – a = Laden, Gegner, Takt, Routen Lotti + Greta; b = Sterne, Stempel, Extras;
c = Bilder je Abschnitt, je < 10 min –, Port 4630 + PORT_BASE, Bilder `tests/out/w4lb_*.png`; `ONLY=<Text|Text>`,
`HERO=lotti|greta`, `VERBOSE=1`; Piep-Takt im Test über `music.setManualClock(true)` + `advanceClock(1/120)` je Schritt):

- **4-3 „Neonsteg im Takt“** (parcours, beep, course_beep 128 BPM, 400 s, ≈ 285 m nach −Z): Start-Tanzfläche
  (Leuchtfliesen im Takt, tanzende Piep-Roboter, Discokugel, Leuchtschrift) → **Taktgasse** (rotes Piep-Tor + blaue Brücke
  über einer flachen Grube, Geländer – harmlos) → **Reihe 1** (rot/blaue 2-m-Streifen) → Insel 1 mit Spiegelfrucht →
  **Reihe 2** (6 m rot, dann 6 m blau: Sprung im Wechsel) → Insel 2 mit Spiegelfrucht und Bumerang-Werfer → **Reihe 3**
  (Schachbrett aus 2-m-Würfeln) → Druckfeld-Insel: zwei Felder einer Gruppe gleichzeitig (Heldin + Klon; Klon-Automat,
  Spiegelfrucht wächst alle 2,5 s nach) schalten den Laserzaun ab → **Reihe 4** „Laufwelle“ (vier Gruppen rot/blau mit
  Versatz 0/4 Zählzeiten: alle 4 Zählzeiten rückt der feste Doppelstreifen 3 m vor) → Warp-Insel: links ein 1,6-m-Steg am
  Bumerang-Werfer vorbei → **Stern 1**; rechts der **Rundweg** über Piep-Steine (Ost rot, Süd blau, West rot), der im
  Kreis zur Insel zurückführt (Münzen, Werfer, **unsichtbarer 1-Up-Block**); geradeaus die Warp-Box → Turmfuß vor dem
  Lautsprecherturm (Membranen pumpen im Takt): vier **Piep-Treppenläufe** aus je vier schwebenden Stufen (1,5 m hoch und
  tief) mit festen Absätzen – rot, blau, rot, rot-rot-blau-blau (Sprung im Wechsel) –, 30 m hoch, Sicherheitsnetz unter
  den oberen Läufen → Checkpoint (y 31); links der Viererlift in einer Geländer-Ecke (zwei Trittstufen; Klon-Automat und
  ?-Block mit Spiegelfrucht daneben) → **Stempel** auf dem Sims (oder Krallen-Anzug aus dem ?-Block, Kletterwand) →
  Abstieg über drei Absätze (Bumerang-Werfer) und zwei Piep-Platten, Warp-Box → Uhrenplatz (y 24): Röhre neben drei
  Zeit-Uhren (+10 s) → **Bonusraum** (x ≈ 90, eigene Kamera): Druckschalter, zehn blaue Münzen im Ring (jede zweite hoch)
  in 10 s → **Stern 2**; rote **Piep-Rutsche** (fest nur solange Rot gilt, Fangnetz darunter) → Rutschenfuß: zwei
  Druckfelder gleichzeitig (Klon-Automat, ?-Block) → **Stern 3** → Schlussaufstieg: zwei Piep-Treppen (rot;
  blau-blau-rot-rot), Fangnetz → Zielplateau mit Tanzfläche und Zielmast. Gegner: Bumerang-Werfer 7 (`feuer_werfer`,
  `weapon: 'bumerang'`). Route ≈ 100 s (der Bot wartet an jeder Reihe auf die passende Zählzeit).
- **4-4 „Trampolin-Alm“** (parcours, bounce, course_bounce, 400 s, ≈ 230 m nach −Z): Startwiese (Almhütte mit Rauch,
  Kühe mit Glocken, grasende Schafe, Windrad, Drachen, Bienen; Felswand hinten links mit **Wandloch – Stern 1**:
  Springklotz davor als Feder oder Krallen-Anzug aus dem ?-Block an der kletterbaren Wand) → Schlucht mit zwei
  Pilztrampolinen auf Felssäulen (Wolken darunter) → Terrasse B (Stachelpanzer, Krabbelkäfer, drei Springklötze vor der
  6-m-Stufe, oranges Trampolin) → Terrasse C (Flatterkäfer-Schwarm, Stachelpanzer, hüpfender Springklotz) → weiße Treppe →
  Checkpoint-Plateau D; hinter der Treppe zwei Pilztrampoline auf zwei Felssimse → **Stern 2** → **Riesentrampolin-Fahrt**
  (107 m, 4,2 m/s, startet beim Draufspringen, über einem Wolkenmeer): sechs Flatterkäfer-Räder (eines waagerecht als Ring
  um die Bahn, eines entlang der Bahn), zwischen zwei Rädern hoch oben der **Stempel** (nur mit getimtem Sprung kurz vor
  der Landung ×1,4 – gehaltene Taste reicht nicht), links eine Wolke mit Warp-Box → **Kletterzaun-Raum** (x ≈ −107,
  frontale Kamera 24°): vier Kettenzäune (fest, seitlich und senkrecht fahrend) → **Stern 3** auf dem Sims, Warp-Box zur
  Zielinsel → Zielinsel (Springklotz unter einem **unsichtbaren 1-Up-Block**, Springklotz neben dem Zielmast für die
  Spitze). Gegner: Krabbelkäfer 4, Flatterkäfer 55 (6 Räder × 8 + 7), Stachelpanzer 5, Springklotz 9. Route ≈ 43 s.
- **Level-Haken** (`LEVEL.setup` = `levelSetup` + `cullStatic`): Inseln ohne Sonnenschatten (`flatIslands`), `laserGate`
  (Signal `open`), `klonAutomat`, `fangnetz`, `neonRail`; Takt-Kulisse über `beatNow(level)` (liest `level.beepClock`):
  `danceBots`, `beatTiles`, `laserFans`, `noteFloat`, `neonSign`, `speakerTower`, `discoBall`; Bergwiese: `rockWall`
  (Achse x|z, Wandloch), `nicheFrame`, `cloudSea`, `sheep`, `kite`, `bees`. Budget: `wheelSwarm` zeichnet alle Glieder der
  Flatterkäfer-Räder als sparsame Käfer (≈ 520 statt ≈ 4500 Dreiecke, zwei Zeichenaufrufe für alle Räder; ersetzt dazu
  `rad.inst` – ändert sich `kaefer_rad.js`, hier nachziehen), `bugSwarm`/`instanceEnemies` für die übrigen Gegner,
  `farHide`, `modelDiet` (Kulissen-Modelle ohne Schatten, fern ausgeblendet), Roboter nur in der Nähe; große Piep-Felder
  mit `cell: 2` (vier statt sechzehn Zellen je 2 × 2 m).
- **Kennzahlen** (scale 2, inkl. Schattenpass): 4-3 22 Abschnittsbilder 70–111 Zeichenaufrufe, 135–243 k Dreiecke; mit
  vier Figuren am Stempel-Sims 143 Aufrufe / 247 k; 4-4 19 Bilder 70–103 / 148–220 k. Piep-Treppen mit `run: 1.49`
  (eine Zelle je Stufe in Laufrichtung statt zwei), Rundweg-Steine `cell: 2`, Rutsche 3,4 m breit.
- **Hinweise/Wünsche**: Eine Piep-Zelle kostet ≈ 750 Dreiecke (fest) bzw. ≈ 600 (Umriss + Füllung) – große Felder nur mit
  `cell: 2`; `piep_rutsche` kennt kein `cell` (eine Zelle je m²). Münzen und ?-Blöcke werden immer gezeichnet (≈ 400
  bzw. ≈ 3000 Dreiecke je Stück). Wünsche: `cell` für die Piep-Rutsche, Fern-Detailstufe für Registry-Käfer in
  `flatterkaefer_rad`. (Inzwischen zeichnen Münz-/Block-Pools nur Sichtbares, ferne in Detailstufe; `piep_rutsche`
  kennt `cell` – Präzisierung „Leistung und Level-Haken 2“.)

**Level-Notizen 4-1 / 4-2** (Level-Agent; Hilfen `src/course/levels/w4/_helpers_a.js` ohne `LEVEL`; Test
`tests/course_w4a.mjs [4-1|4-2]`, Port 4412 + PORT_BASE, Bilder `tests/out/w4a_*.png`; `PARTS=route,sweep,targets,extra,shots`
(je Lauf ≤ 10 min, einzeln aufrufbar), `HEROES=lotti,greta`, `ONLY=<Text>`, `SHOTS_ONLY=1`, `VERBOSE=1`):

- **4-1 „Kribbelkrabbel-Schlucht“** (parcours, canyon, course_canyon, 400 s, ≈ 250 m nach −Z): Wüstenstart (Sandplateau,
  Ameisenhügel mit marschierender Kolonne, Lagerfeuer der Ameisen mit Zelten und Kochtopf, Kakteen mit Blüten, Geier auf
  Felsnadeln, Kuhschädel, Steppenläufer, Gecko, Wimpelkette; niedriger Felsblock als Einführung „Ameisen laufen auch an
  Wänden“) → **Ameisenhöhle** (dunkle Höhlen-Stimmung, Fackeln, Leuchtkristalle, Tropfsteine; **Ameisenwand** 6,4 m – nur
  auf dem Rücken einer Ameise hinauf; **Stempelturm** 10,5 m, Ameisen tragen hinauf, **Stempel** darüber; **Ameisen-Fähre**:
  Ameisen laufen waagerecht an den Seitenwänden und tragen 14 m über die Schlucht; Ameisenspuren an allen Wänden zeigen
  die Wege) → Hörnerreihen (gleich nach der Höhle links der ?-Block mit Krallen-Anzug und die Kletterwand zum Sims mit
  **Stern 0**; Checkpoint; Reihen von Hörner-Ameisen, ein Wall mit gewöhnlichen Ameisen, **Funkelstern** auf der
  Plattform, zwei Mauern mit Hörner-Ameisen) → **Stachelfeld** (aus der Höhle rechts kommen endlos Riesenameisen und tragen
  auf ihrem Lastdeck zur Höhle links; Felsinsel mit **Röhre in den Ameisenraum**: Vorratskammer mit Zuckerwürfeln,
  Krümeln, Ameiseneiern, Ameisen tragen auf den Vorratsturm → **Stern 1**, Rückweg per Röhre aufs Endsims; am Ende des
  Felds die Felssäule mit **Stern 2**, vom Deck aus) → Endsims mit Zielröhre → Zieltafel (Ameisen-Ehrenrunde,
  Wimpelkette, Zielmast). Extraleben: unsichtbarer Block über dem großen Ameisenhügel am Start. Gegner: Ameisensoldat 41,
  Hörner-Ameisensoldat 23, Riesenameise (Strom, `every 3 s`, höchstens 12). Bot-Zeit ≈ 96 s.
- **4-2 „Das Lila Nebelmoor“** (parcours, poison, course_poison, 400 s, ≈ 260 m): Giftpfad (gewundener Moospfad,
  Sumpfhütte auf Stelzen, Nebelbänke, Libellen, Frösche, Seerosen, Schilf, Giftpilze; Rankenschnapper wachsen im Takt
  über den Weg, Funkenblüten; ein Rankenschnapper liegt auf einer Röhre – Stampfattacke auf den Kopf → Röhre frei →
  Moorkeller mit **Extraleben**) → Höhle (Rankenschnapper hängen von der Decke; im Giftbecken **vier Rankenschnapper als
  Stufen** zum Sims, dort die **Warp-Box zwischen zwei hängenden** → Sternkammer, **Stern 0**) → Rückkehr (Checkpoint, die
  schmale Brücke, über die der **große Rankenschnapper** wächst – Kopf ruht über der Brücke, drei Stampfattacken besiegen
  ihn, sonst den Rückzug abpassen) → Wasserzone (klarer, sicherer Moorsee mit Grasinseln; **Stern 1 ganz unten im See**;
  vom Kopf eines Rankenschnappers im Wasser **abprallen** → versteckter Münzpfad über Felssimse zum **Stempel**; Röhre
  hinauf) → Oberland mit **Roulette-Block**, paarweise im Takt fahrende Plattformen über Gift (Brummer), Sternring-Insel
  (**Stern 2**: acht Sternmünzen in 10 s), Zielröhre → Zielinsel. **Welt-Warp**: Krallen-Anzug aus dem Roulette-Block →
  bewachsene Felswand links hinauf → versteckte Plattform → zwei Plattformen → hinter dem Giftwasserfall (Vorhang ohne
  Schaden) die goldene Röhre `warpWorld: 5`. Gegner: Rankenschnapper 26, Brummer 3. Bot-Zeit ≈ 67 s.
- **Level-Haken** (`LEVEL.setup = levelSetupLate(setup, late)`): wie `levelSetup` (w2), danach `late` – Sichtprüfungen,
  die die Abschnitts-Meshes vermessen (`cullStatic`, `fernAus`), laufen erst **nach** dem Verschmelzen. `addStatic` der
  Hilfen teilt Geometrie je Dreieck nach Abschnitt (32 m) auf – sonst landet eine Streuung über das ganze Level (Kiesel,
  Grasbüschel …) als Ganzes im Abschnitt ihrer Mitte und wird mit dessen Sichtprüfung aus- und eingeblendet.
  `rockLids`/`lidParts`: Felsdeckel für `island` mit `top: 'none'` (der Baustein zeichnet dann **keine** Oberseite).
  `xrayWalls`: hohe Felsblöcke (`camIgnore`), werden durchscheinend, wenn sie die Figur verdecken. `areaMoods`: Stimmung
  je Bereich (Höhle, Ameisenraum, Sternkammer). Budget: `cullInstances` (Instanz-Gruppen der Ameisen, Riesenameisen,
  Münzen: nah mit Schatten, fern ohne, außerhalb aus), `creeperInstances` (Rankenschnapper als gemeinsame
  Instanz-Gruppen, blitzende Köpfe einzeln), `chunkBackdrop` (Himmels-Kulisse in Kacheln mit Sichtprüfung), `spikeField`
  (sparsame Stacheln), `heroShadowDiet`, `gegnerSicht`.
- **Kennzahlen** (scale 2, inkl. Schattenpass; Abschnittsbilder 18 bzw. 21, dazu Messgang alle ~7 m entlang der Route):
  4-1 42–92 Zeichenaufrufe, 83–253 k Dreiecke; 4-2 40–101 / 95–247 k.
- **Wünsche an den Motor**: `island` mit `top: 'none'` sollte eine Felsoberseite zeichnen (oder ein Stil `top: 'rock'`);
  StaticBatcher könnte große Geometrien selbst je Abschnitt teilen; `xrayWalls` (Durchsicht hoher Blöcke) als Baustein;
  Instanzen/Fern-Ausblendung der Ameisen-, Riesenameisen- und Münz-Gruppen im Motor (hier level-lokal); nach einer
  Stampfattacke auf einen Rankenschnapper-Kopf ein kleiner Abprall (über Gift fällt die Figur sonst hinein).
  (Umgesetzt bis auf den Abprall – Präzisierung „Leistung und Level-Haken 2“: `top: 'rock'`, Teilung je Abschnitt,
  `island xray`/`view.xray`, `LEVEL.instances`; 4-1/4-2 nutzen `LEVEL.instances` statt `cullInstances`, `xrayWalls`
  über `view.xray`.)

**Level-Notizen 4-5 / 4-A / 4-B** (Level-Agent; Hilfen `src/course/levels/w4/_helpers_c.js` ohne `LEVEL`; Test
`tests/course_w4c.mjs [4-5a|4-5b|4-5c|4-5d|4-A|4-B]` – Laden + Routen, Sterne/Stempel/Extraleben, Mechanik, Bilder, Arenen;
je Teil < 10 min; Port 4610 + PORT_BASE, Bilder `tests/out/w4c_*.png`; `ONLY=<Text|Text>`, `VERBOSE=1`):

- **4-5 „Säulenstadt der Stachelwalzen“** (parcours, ruins, course_ruins, 400 s, ≈ 265 m nach −Z; Höhen 1 → 3,5 → 6 → 9 → 12
  → 14,5): **Ruinenstart** (Mosaik-Rosette, Hasenbrunnen mit Wasserstrahl, Torbogen; links die **schrägen Stufen – Stempel**
  oben; Hang 1 mit Walzenwerfer oben – Walzen rollen herab und zerschellen an einer Prellmauer am Hangfuß; Säulenplatz mit
  trockenem Brunnen, rechts auf dem Sims die **Röhre in den Schalterraum**; Hang 2 mit zwei Walzenwerfern; Kante →
  bewegliche Plattform zum Checkpoint) → **Checkpoint-Insel** (?-Block mit Krallen-Anzug, links der **Rundturm** = gewölbte
  Kletterwand, **Stern 1** oben; rechts die L-förmige **Balkenbrücke** mit Spiegelfrucht-Strauch zur hohen Mauer) →
  **Plattformfahrt** (längs, quer, schräg aufwärts, dazwischen Rast-Säulen; Aufstieg über Hang 3 mit Walzenwerfer) →
  **Stachelstangen** (drei fahrende Plattformen mit drehenden Stachelstangen – einarmig schnell, im Finale zweiarmig;
  Insel mit großer Stachelstange, Insel mit zwei gegenläufigen; links die **Schwankplattform – Stern 2**) → **Zielhang**
  (Zielplateau mit Brunnen, Zielmast, **versiegelte blaue Röhre** mit Gitterdeckel und Schild „Werfer-Festung (über die
  Weltkarte)“ – Ducken darauf zeigt die Ansage; 4-B selbst ist auf der Karte erreichbar). **Stern 0**: Schalterraum
  (x ≈ 80, z ≈ +50 hinter dem Start – eigener 32-m-Abschnitt des Batchers, sonst zählte seine Zier beim Säulenplatz
  mit; eigene Kameraschiene `area`) – Farbfeld 4 × 4 färben, Röhre zurück auf den Säulenplatz. Zier: Mosaikpflaster,
  drei Hasenbrunnen mit Wasserstrahl (einer trocken), Ranken, Rampenpflaster mit Mittelstreifen, gemauerte Hangwände,
  fahrende Plattformen mit Mosaik-Deckblatt (`moverTops`, Instanzen), Dschungelbäume, Dschungeltal tief im Abgrund,
  Vögel, Schmetterlinge. **Extraleben (3)**: oben
  auf der Mauer rechts neben dem Turm – Spiegelfrucht auf dem 1,2 m schmalen Balken nehmen (seitlich kein Boden → der Klon
  erscheint **hinter** der Figur), im Gänsemarsch weiter: die vordere Figur fällt in den Graben (0,8 m) vor dem glatten
  Sockel, die hintere läuft ihr auf den Kopf → **Räuberleiter** (`raeuberleiter`, level-lokal: Hochwurf 19,5 m/s, frische
  Kletterzeit) → mit Krallen-Anzug das Rankenband (7–8 m über dem Balken, kletterbar) hinauf. Ohne Klon unerreichbar
  (Sockel `noWallSlide`, Dreifachsprung endet 0,5 m darunter), ohne Krallen wirft der Klon nur hoch. Gegner: Walzenwerfer
  10, Rollpilz 8; Stachelstangen 6. Bot-Zeit bis zum Zielmast Lotti 91,0 s / Greta 90,7 s; ohne Unverwundbarkeit
  (Ausweichen per Sprung) Start → Plateau ohne Treffer, Stachelplattform 1 mit Ecken-Taktik (die Kugeln reichen nicht in
  die Plattformecken) ohne Treffer.
- **4-A „Glutbrocken-Gerangel“** (arena, lava, course_arena, 200 s, 1 Stern): Basaltinsel (r ≈ 11,6 m) mit glühenden Rissen
  und Basaltwaben, Basaltsäulen-Gruppen im See, Kraterwand mit zwei Lavafällen, Vulkane, Lavablasen, Glutfunken,
  Dampfschwaden, Glutkristalle, Hinweisschild „Draufspringen, aufheben, werfen!“. Welle 1: ein Lavabrocken; ist er besiegt,
  **springen drei aus der Lava** im Bogen auf die Insel (`lavaWaves`, Ansage). Besiegen: draufspringen → betäubt →
  aufheben → in die Lava werfen oder gegen einen anderen Brocken (beide zerplatzen). ?-Block Krallen-Anzug (Tatzenhieb
  betäubt), Münzblock. Tod setzt Arena und Wellen zurück.
- **4-B „Blaugitter-Bastion der Feuer-Werfer“** (arena, fortress, course_arena, **100 s**, 1 Stern): Festungshof 22 × 22 m,
  blaue Rautengitter (Modell `festungsgitter`, drei Wände zu je einem Mesh pro Material verschmolzen: `mergeModels`), vorn
  Brüstung; Galerie (Einweg, 2,6 m) und zwei Seitenbühnen (2,2 m) – die drei Feuer-Werfer starten oben und springen
  zwischen Bühne und Boden; Wappen-Mosaik (blauer Ring, goldene Flamme), Außenmauern mit blauem Band, Ecktürme mit blauen
  Kegeldächern und wehenden blauen Fahnen, Banner, Steckbrief „Gesucht: Lotti & Greta“, Lager (Fässer, Kisten,
  Feuerkugel-Vorrat), Feuerschalen, Wimpel. Bot (echte Eingabe, draufspringen) gewinnt in ≈ 24 s.
- **Kennzahlen** (scale 2, inkl. Schattenpass): 4-5 (23 Abschnittsbilder) 76–110 Zeichenaufrufe, 162–268 k Dreiecke
  (Walzenwerfer-Modell ≈ 10,5 k Dreiecke: Instanzgruppe ohne Sonnenschatten; Münzen ≈ 33 k werden immer gezeichnet);
  4-A 68–83 / 73–94 k; 4-B 66–112 / 139–177 k. Rampen bekommen level-lokal `camIgnore` (der Kamerastrahl prüft Hüllquader,
  auf der Rampe steckt der Kopf darin), ebenso die 1-Up-Mauer. Wünsche an den Motor: `camIgnore`-Parameter im Baustein
  `ramp`; Räuberleiter (Figur auf Figur) als Motor-Regel für Klone; Detailstufe für Münzen und Walzenwerfer.

**Level-Notizen 4-Burg / 4-Haus** (Level-Agent; Hilfen `src/course/levels/w4/_helpers_d.js` ohne `LEVEL`; Test
`tests/course_w4d.mjs <Teil> …` nach `npm run build`, Port 4612 + PORT_BASE, Teile je < 10 min: `burg-route` (Laden,
Daten, Gegner, Routen Lotti + Greta bis in den Thronsaal, Lavafunke verletzt, Lava tötet), `burg-sterne` (Sterne 1–3,
Stempel, unsichtbarer Block, Lavaschlot, roter Ring), `burg-boss` (ein Lauf mit allen Sternen + Stempel, Tod im Kampf,
3 Würfe, Baron-Szene, Warp-Box, Zielmast, Speicherstand), `burg-bilder`, `haus` (alle zehn Räume per Skript, Lotti und
Greta, je < 10 s ohne Treffer, Ergebnis 10/10), `haus-extra` (Raumuhr, Zeitablauf → 1/10, Tod → Raum neu, Riesenprojektil,
Stampfstein, Bröckelblöcke, Bilder), `haus-raum` (Fehlersuche: `RAUM=n`, `PRE=Schritte`, `HERO`, `LEGS=<JSON>`);
`ONLY=<RegExp>`, `VERBOSE=1`, `TRACE=1`; Bilder `tests/out/w4d_*.png`):

- **4-Burg „Glutburg des Felsenkönigs“** (parcours + boss, lavacastle, course_lavacastle, 400 s, ≈ 215 m + Thronsaal, nach
  −Z; Lava y 0): Zinnenterrasse (y 10, ?-Block Wachstumsbeere, Münzblock) → Hang hinab (Lavabrocken, Ziegel) → Vorhof
  (y 4; Pilzlingsturm, Lavabrocken, Lavaschlot liefert nach) mit zwei Druckfeldern einer Gruppe: **Stern 1** = Lavabrocken
  auf das eine Feld werfen, selbst aufs andere → Ketten reißen, die **Fallbrücke** kracht über den Graben zum Sternturm →
  Treppe → drei **Drehplattformen** über der Lava (Balken, Dreistern, Kreuz; Lavafunken an den Armen), **roter Ring** auf
  der Insel dazwischen (8 rote Münzen) → Kontrollpunkt → **Lavarohr** (Glasröhre durch den See) → Rohrhof: links
  ?-Block mit Krallen-Anzug, Kletterwand → **Stempel** auf der Mauerkrone (ohne Krallen unerreichbar); rechts drei
  Druckfelder: zwei Lavabrocken + die Figur öffnen das Fallgitter der Nische → **Stern 2** → langer Burgpfad (Pilzlingstürme,
  Lavabrocken, Warp-Box zum Turmbalkon x ≈ 30: Lavabrocken von der Kante aufs Druckfeld werfen → Trittsteine steigen aus
  der Lava → **Stern 3** auf dem Podest, Warp-Box zurück) → Lavafunken-Reihe (vier Reihen über Trittsteinen) → Kontrollpunkt
  → rote Boss-Röhre (dahinter **unsichtbarer Block** mit Wachstumsbeere) → **Thronsaal** (Käfig r 11,5, Stimmung `innen`):
  Lavafelsen-König, nur geworfene Lavabrocken treffen (3 Treffer) → er zerfällt → **Baron Brummbär** braust über die
  Burgbrücke heran („Mein Felsenkönig! Das bekommt ihr zurück!“, Kamera schwenkt zum Wagen), flieht, „Welt 4 geschafft!“
  → Warp-Box → Burgtor-Terrasse (Teppich, gestürzte Baron-Statue) → Zielmast. Gegner: Lavabrocken 9, Pilzlingsturm 3,
  Lavafunken 14, König 1. Route (Bot) ≈ 30 s bis zur Röhre, voller Lauf mit allem ≈ 53 s.
- **4-Haus „Haus Sausewind“** (house, house, course_house, 10 Räume à 10 s, je ein Stern, `fail: 'exit'`; Räume bei x 0,
  z 0 / −64 / … / −576, 36–44 m lang, 14 m breit, je Raum eigene Kamera): 1 **Bauklotz-Zimmer** – zwei Sprungfelder
  schleudern über Schluchten auf Riesen-Bauklotz-Klippen (y 4,5 / 7); 2 **Sandkasten-Diele** – Sandweg, vier Bahnen
  Hörner-Ameisen marschieren aus Wandröhren quer (Strom, alle 3,4 s); 3 **Ahnengalerie** – enger Galeriegang (3 m), 0,6 s
  nach dem Start schießt ein Riesenprojektil (8,2 m/s) durch die Öffnung der Vorderwand hinterher, drei Samtkordeln
  überspringen; 4 **Backstube** – fünf Walzenwerfer auf den Backtheken werfen quer über den Weg (Takt ab Raumstart);
  5 **Seiltänzer-Saal** – 1-m-Steg in drei Stücken über dem Abgrund, Münzblock darüber; 6 **Maschinenhalle** – zwei
  Boost-Pfeile unter acht Stampfsteinen (versetzt im 4-m-Gang, Auslöser 0,3 m: wer langsam ist, wird getroffen);
  7 **Schaukelzimmer** – drei gegenläufige Schaukeln (Periode 2,5 s) über dem Abgrund; 8 **Pilzlingsparade** – vier Reihen
  Pilzlinge marschieren heran, vier Mini-Pilzlinge jagen; 9 **Kanonengang** – 1,6-m-Steg, fünf Kanonen auf den Simsen
  feuern Suchköpfe gestaffelt ab Raumstart; 10 **Dachboden** – zwei Reihen Bröckelblöcke (26 m) über dem Abgrund, vom Ende
  rollen Stachelwalzen heran. Jeder Raum: eigene Tapete (10 Leinwand-Muster), eigener Boden, Möbel, Bilder (Atlas mit 16
  Motiven), tickende Wanduhren, große **Raumuhr** über dem Ausgang (roter Zeiger = Restzeit, kleiner Zeiger = Raumnummer),
  Wimpelketten. Raumstart (`raumHaken`): Walzen/Suchköpfe weg, Werfer und Kanonen im festen Takt, Bröckelblöcke zurück,
  Riesenprojektil neu – jeder Versuch beginnt gleich. Bot: 2,4–4,5 s je Raum, Schaukeln 6,7–8,2 s.
- **Level-Haken** (`LEVEL.setup` = `levelSetup` + `cullStatic`): Burg – `lavaSee` (Shader, tödlich), `lavaFaelle`,
  `glutSaum`, `burgBoden` (Glutrisse), `burgMauer` (Zinnen, Schießscharten), `tuerme`, `fackeln`, `banner` (Brummbär-Wappen,
  wehend), `ketten`, `funkenFlug`, `thronSaal`, `baronStatue`, `teppich`, `fallBruecke`, `brockenQuelle` (Lavaschlote),
  `stimmung` (Zone → `innen`), `baronSzene`; Haus – `hausRaum` (Hülle, Täfelung, Tapete, Böden `floors`, Bilder, Uhren,
  Hausrat), `hausFertig` (Bilder-Atlas, Uhrzeiger als Instanzen), `schaukeln`, `wimpel`, `raumHaken`. Budget:
  `teileInstanzen` (Modellteile mehrerer Gegner als Instanzen, auch später erzeugte; `near` = nur in der Nähe),
  `heroShadowDiet`, `farHide`.
- **Kennzahlen** (scale 2, inkl. Schattenpass): 4-Burg 22 Bilder 65–98 Zeichenaufrufe, 143–239 k Dreiecke; 4-Haus 14 Bilder
  40–73 / 139–271 k (Pilzlingsparade am meisten: 18 Pilzlinge).
- **Hinweise/Wünsche**: Kamerafahrten über `archetype.camera` (z. B. `baronSzene`) wirken je Schritt – Testbilder davon
  ohne `snapCamera()` aufnehmen. `islandParts` mit `top: 'none'` hat keine Oberseite – Böden darüber legen (`hausRaum`
  `floors`). Stampfsteine hintereinander in Blickrichtung verdecken die Figur – versetzt
  anordnen. Wünsche: Haus-Archetyp mit Raum-Ereignissen (`onRoomStart`/`onRoomLeave`) statt Abfrage von `level.house`;
  `walzenwerfer`/`kanone_turm` mit `reset()` (Takt neu) für Räume mit Neustart.

---

## Präzisierung (Bausteine Welt 4)

Ergänzung des Bausteine-Agenten (Stand: Canyonwerkstatt 0-14). Nichts oben Festgelegtes wird geändert. Alle Welt-4-
Bausteine, Gimmicks und Themen sind parametrierbare Module; Level-Bauer setzen sie nur in Daten ein. Jede Datei
dokumentiert ihre Parameter vollständig im Kopfkommentar; hier die Felder mit Beispielen. Aktionen (`reward` …) im
bekannten Format (Präzisierung Sonder-Bausteine). Alle Entitäts-Gimmicks (`kind`) sind auch als `type` in `segments`
erlaubt (`w4_misc.js`).

### Präzisierung (Bausteine Welt 4): Dateien

```
src/course/blocks/w4kit.js              beatClock (Taktuhr des Levels), smoothPath, penetrates/figuresIn/pushOutOf
                                        (sanft herausschieben), glowSprite/glowTexture, hash01
src/course/blocks/antpath.js            Ameisen-Laufpfade (Datenformat antpath, antPath, resolveAntPath, antPathAt,
                                        antOrient, placeOnAntPath, antPathOver, antPathAround) – für den Gegner-Agenten
src/course/blocks/types/w4_piep.js      piep_block, piep_treppe, piep_rutsche (System level.piep, Instanzen)
src/course/blocks/types/w4_bounce.js    riesentrampolin, trampolin_orange
src/course/blocks/types/w4_ruins.js     schwankplattform, drehplattform (axis y: Drehteller/-balken; x|z: Wende-Plattform)
src/course/blocks/types/w4_fluids.js    giftwasser, giftfall, lavafall, lavarohr
src/course/blocks/types/w4_ants.js      ameisenweg (benannter Ameisenpfad + Spur)
src/course/blocks/types/w4_misc.js      Entitäts-Gimmicks auch als segments-type
src/course/blocks/types/deco_w4.js      Kulisse Welt 4 (verschmolzen; shadow: false für ferne Kulisse)
src/course/entities/kinds/w4_gimmicks.js  stachelstange, roulette_block, sternring, sternmuenze
src/course/view/theme_canyon|poison|beep|bounce|ruins|lavacastle.js, backdrop_w4.js   Themen + Kulissen
src/course/levels/w0/0-14.js            Canyonwerkstatt (eine Station je Baustein, marks für den Test)
tests/course_w4_blocks.mjs              Port 4370, Bilder tests/out/w4b_*.png (auch je Thema w4b_thema_*.png)
```

Additiv geändert: `view/themes.js` (6 Registrierzeilen, `??=`). Motor, Ansicht, Audio und Modelle bleiben unverändert.

### Präzisierung (Bausteine Welt 4): Modelle

Die Bausteine nutzen die Welt-4-Modelle der Registry (`models/kinds/*_w4.js`), sobald `hasModel(name)` gilt; sonst
bauen sie ihre eigene Rückfall-Geometrie (gleiche Kollision, gleiches Verhalten). Zuordnung: `piep_block` (Geometrien
aus `models/lib/w4Geos.js`, Darstellung über eigene Instanz-Meshes, s. u.), `riesentrampolin` (`radius` = size/2 + 0,25,
`squash`/`anim` je Abprall), `trampolin_orange` (in xz auf `size` skaliert, Neigung um die Mattenmitte), `stachelstange`
(nur `axis: 'y'` und `arms` ≤ 2; dann wird `length` auf 0,25 m gerundet und `height` steht auf 0,75 = `barHeight`),
`schwankplattform` (Drehpunkt 0,5 m unter der Oberseite wie im Modell; Kollision folgt ihm), `roulette_block` (Modell
**`roulette_block_w4`**, Symbole: wachstumsbeere/beere/pilz → pilz, funken → blume, krallen, stern, coins → muenze; nur
wenn alle `items` abbildbar sind, sonst der alte Glasblock), `sternring`/`sternmuenze`, `giftwasser` (Modell-Oberfläche;
`look: 'shader'` erzwingt die eigene Shader-Fläche), `giftfall`/`lavafall` (`giftwasserfall`/`lavafall`, um `yaw − π/2`
gedreht, damit „Vorderseite +Z“ gilt). Die Piep-Ansicht zeichnet je Farbe 4 Instanz-Meshes (Körper, Umriss, Füllung,
unsichtbare Schattenkörper als einfache Quader) und schreibt nur Blöcke im Umkreis von 46 m um die Kamera-Zielfigur
(Schatten 24 m) – so bleibt auch eine 30-m-Piep-Treppe unter dem Dreiecks-Budget.

**`deco_w4` mit Modellen** (Vorderseite bzw. Durchgang bei `yaw: 0` nach +X, wie bei allen Modellen; `solid` je Art,
`shadow: false` für ferne Kulisse). Vorhandene Arten wechseln automatisch auf das Modell: `felsnadel(n)` (`height`),
`tafelberg` (`size`|`radius`, `height`), `giftbaum/-baeume` (`height`), `saeule(n)` → `ruinen_saeule` (`broken`),
`statue` → `statue_bruch` (`size`), `ruinenbogen` → `ruinen_torbogen` (`width` = lichte Weite, `height`; Durchgang ±X →
für einen Weg entlang z `yaw: π/2`), `ranken` (`width`|`length`, `lage: 'boden'`), `kette(n)` → `burg_kette`
(`length`), `banner` → `brummbaer_banner` (`height`, `width`), `burgzinne` → `burgmauer` (`from`/`to`, `height`,
`thick`), `lautsprecher` (pulsiert im Takt), `windrad` (`height`, `speed`). Neue Arten: `canyon_bogen` (`width`,
`height`, `thickness`), `ameisenhuegel` (`size`), `ameisenhoehle` (`width`, `height`), `giftpilz` / `giftpilze`
(Streuung wie `leuchtpilze`), `liane` (`length`, `sway`), `giftwasserfall`/`lavafall` (nur Kulisse, nicht tödlich –
tödlich ist der Baustein `giftfall`/`lavafall`), `neon_ring` (`radius`, `color` 'cyan'|'magenta'|…, pulsiert im Takt),
`equalizer_saeule` (`height`, `segments`, Pegel im Takt), `wolkeninsel` (`size`, begehbar), `ruinen_treppe` (`steps`,
`width`, `rise` 0.35, `run` 0.55; steigt nach +X, begehbar), `fallgitter` (`width`, `height`, `open`; mit `id` ein
Griff `open()`/`close()`/`toggle()`/`start()` für Aktionen, geschlossen fest), `festungsgitter` (`width`, `height`).

### Präzisierung (Bausteine Welt 4): Taktuhr, Herausschieben, Ameisenpfade, tödliche Flüssigkeiten

- **Taktuhr** `beatClock(level)` (= `level.beepClock`, eine je Level, in `level.onStep` angemeldet): folgt
  `music.beat()`, solange das Sync-Thema spielt (`LEVEL.beepTheme`, Standard `'course_beep'`; aus `themeInfo().sync`
  kommen `every` = switchEvery 8 und `warn` = warnBeats 3), sonst – Funkelstern-Thema, Musik aus, anderes Level-Thema –
  einer eigenen Uhr auf der Simulationszeit im Tempo des Sync-Themas, die stetig an die letzte Zählzeit anschließt. Kehrt
  das Sync-Thema zurück, gilt wieder seine Zählung. `LEVEL.beepClock = 'level'` erzwingt die eigene Uhr, `'music'` folgt
  jedem laufenden Thema. Felder `beat`, `whole`, `source` ('music'|'level'), `bpm`, `every`, `warn`, `mode`,
  `onBeat(fn(whole, k))`, `info()`. Pieps (`sfx('beep')` auf den Warn-Zählzeiten, `'beep_switch'` beim Umschalten) spielt
  die Uhr nur bei eigener Uhr – `course_beep` hat sie schon in der Bell-Spur. Tests: `music.setManualClock(true)`,
  `music.play('course_beep')`, dann je Simulationsschritt `music.advanceClock(1/120)` + `step(1)` (deterministisch).
- **Piep-Zustand:** Zählzeit b (+ `phase`), Block `floor(b / every)` gerade → rot fest, blau Umriss; ungerade →
  umgekehrt. Warnung in den letzten `warn` Zählzeiten (Blinken je Zählzeit). Kollision: Quader/Rampen nur im festen
  Zustand in der Welt (Nachbar-Würfel zusammengefasst). **Herausschieben:** steckt beim Erscheinen eine Figur (auch Klon)
  oder ein Gegner im Block, bleibt er „ausstehend“ und schiebt sie mit 7 m/s (mit Kollision gegen alles andere) hinaus –
  nach oben, wenn die Füße im oberen Teil stecken (≤ 0,65 m), nach unten, wenn nur der Kopf knapp hineinragt, sonst zur
  nächsten Seite; erst dann wird er fest. Darstellung: 4 Instanz-Meshes für alle Piep-Blöcke (fest/Umriss je Farbe;
  Meshes ohne sichtbare Blöcke werden nicht gezeichnet; Modelle s. o.).
- **Ameisenpfade (4-1):** Datenformat `antpath: [[x, y, z, nx, ny, nz], …]` (Fußpunkte auf der Lauffläche mit
  Flächennormale; gleiche Stelle mit neuer Normale = Kante, die Normale wird über `round` 0,35 m überblendet; `{ path,
  loop }` für Rundwege) oder die Id eines Bausteins `ameisenweg`. Gegner lesen ihn mit `resolveAntPath(level,
  spec.antpath)`, tasten ihn mit `antPathAt(path, s)` → `{ pos, normal, tangent, face }` ab; `placeOnAntPath(root, path,
  s, dir)` richtet ein Modell (Blick +X, oben +Y) auf der Fläche aus. Generatoren: `antPathOver({ pos, size }, { along,
  at, from, to })` (über eine Wand), `antPathAround(...)` (Rundweg um einen Block).
- **Giftwasser, Gift-/Lavafall:** Formen `kill: 'gift', lava: true, poison: true` bzw. `kill: 'lava'` (nicht fest) – die
  Figur stirbt wie in Lava (`deathCause 'lava'`); Gegner im Giftwasser versinken (0,7 s, `markDefeated`, zählen als
  besiegt). Oberflächen-Schlieren im Shader (`onBeforeCompile` auf Standard-Material, Nebel bleibt).

### Präzisierung (Bausteine Welt 4): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `piep_block` | Piep-Blöcke im Musiktakt (fest ↔ Umriss), Warn-Blinken, Herausschieben | `color` 'rot'\|'blau', `phase` 0 (Zählzeiten-Versatz), `every` 8, `warn` 3, `pos`+`size` [w,h,d] \| `blocks: [[x,y,z]…]` \| `grid: [nx,nz]`\|`[nx,ny,nz]` + `pos` \| `map: ['rb.', …]` + `pos` (Zeilen nach −Z, r/b, R/B = 2 hoch), `cell` 1, `id` → `{ groups, boxes, solid, info() }` | `{ type: 'piep_block', color: 'rot', pos: [0,0,-14], size: [6,1,4] }`, `{ type: 'piep_block', pos: [-7,1,-25], map: ['rbrb','brbr'] }` |
| `piep_treppe` | schwebende Stufen, Farben im Wechsel | `from` (Mitte unten der 1. Stufe), `dir` [0,−1], `steps` 8, `rise` 1, `run` 1, `width` 2, `height`, `colors` 'wechsel'\|'rot'\|'blau'\|[…], `first`, `phase`, `every`, `warn`, `id` | `{ type: 'piep_treppe', from: [7,1,-24], steps: 5, run: 1.2 }` |
| `piep_rutsche` | Rutsche (Flag slide) aus Farbstreifen | `pos`, `size` [w,h,d], `axis` 'z', `dir` 1 (Oberseite steigt nach +axis), `band` 2, `thick` 0.6, `colors`, `slope` 0.85, `phase`, `id` | `{ type: 'piep_rutsche', pos: [-6,1,-42], size: [4,4,12], dir: 1 }` |
| `riesentrampolin` | großes Trampolin fliegt einen Pfad (startet beim Draufspringen), Figur federt und fährt in der Luft mit, getimtes Drücken ×1,4, trägt Gegner | `path` (weich verbunden), `pos`, `size` 6, `height` 0.9, `strength` 15, `boost` 1.4, `speed` 4, `mode` 'once'\|'loop'\|'pingpong', `wait` 1, `start` 'bounce'\|'auto'\|'signal', `reset` true (nach Tod zurück), `carry`, `carryR`, `id` → `{ pos, s, L, running, done, bounces, riders, start(), stop(), reset(), info() }` | `{ type: 'riesentrampolin', id: 'rt', path: [[0,0.1,-67.5],[1.5,2.5,-76],[0,3,-85],[0,0.1,-93]] }` |
| `trampolin_orange` | starke Feder (Höhe je Stärke), auch schräg; Matte 1 m über `pos` | `pos`, `size` 1.8, `strength` 21 \| `height` (m), `angle` 0 (Grad), `dir` [0,−1], `boost` 1.3, `id` | `{ type: 'trampolin_orange', pos: [5,1,-57], angle: 35, dir: [0,-1] }` |
| `stachelstange` | drehende Stange mit Stachelkugeln (Treffer), auf Säule; mit `attach` auf beweglicher Plattform | `pos` (Säulenfuß), `height` 1 (mit Modell 0.75), `length` 4 (mit Modell auf 0,25 gerundet), `arms` 1, `balls` 3, `radius` 0.42, `speed` 1.2, `angle`, `axis` 'y'\|'x'\|'z', `bar` false, `post` true, `attach` (mover-/Plattform-Id; Fahrzeuge nehmen selbst mit), `id` | `{ type: 'stachelstange', pos: [5,1.5,-110], attach: 'm1', length: 1.7 }` |
| `schwankplattform` | kippt unter Last (bis `max`), Figur rutscht ab `slideFrom`, schwingt gedämpft zurück | `pos` (Mitte der Oberseite in Ruhe; Drehpunkt 0,5 m darunter), `size` [6,3], `thick` 0.6, `axis` 'x'\|'z', `max` 26, `slideFrom` 14, `slideSpeed` 4.5, `stiffness` 7, `damping` 3.2, `weight` 1, `post`, `postDown` 6, `style` 'ruine'\|'stein'\|'holz', `id` → `{ tilt, omega, load, info() }` | `{ type: 'schwankplattform', pos: [0,1,-130.5], size: [6,3] }` |
| `drehplattform` | axis 'y': Drehteller/-balken (mover dyaw); 'x'\|'z': Wende-Plattform | y: `pos`, `arms` 2 (0 = Scheibe, 3, 4), `length` 4, `width` 1.8, `thick` 0.5, `speed` 0.6, `angle`, `hub`, `style` 'stein'\|'lava'\|'holz', `idle`; x/z: `size` [4,4], `mode` 'flip'\|'spin', `wait` 2.5, `turn` 1.1, `warnT` 0.8, `speed`, `phase`; `id` → `{ angle, flips, solid, start(), stop(), info() }` | `{ type: 'drehplattform', axis: 'y', pos: [-4,0.3,-214], arms: 4, style: 'lava' }` |
| `giftwasser` | tödliches lila Giftwasser, Gegner versinken, Blasen, optional fließend | `pos`, `size` [w,h,d] (Oberfläche y+h), `flow` [vx,vz], `bubbles`, `color` 'lila'\|'gruen', `body`, `rise` { to, speed }, `id` → `{ top, sunk, setLevel(y, speed), start() }` | `{ type: 'giftwasser', id: 'gift', pos: [0,-1.6,-170], size: [12,2.2,20], flow: [0.4,0] }` |
| `giftfall` / `lavafall` | senkrechter Gift-/Lavafall (tödlich oder nur Vorhang) | `pos` (Mitte der Unterkante), `width` 3, `height` 8, `yaw` 0 (Vorderseite +Z), `depth` 0.6, `speed` 4, `kill` true, `glow`, `color` | `{ type: 'lavafall', pos: [-11,0.4,-220], height: 7, yaw: Math.PI / 2 }` |
| `lavarohr` | Glasröhre durch die Lava mit Glutsaum | Felder von `glasspipe` + `lava` (Oberfläche) | `{ type: 'lavarohr', path: [[6,1.6,-204.5],[6,0.4,-209],[6,0.4,-226],[6,1.6,-231]], lava: 0.5, coins: 4 }` |
| `roulette_block` | Symbol wechselt im Musiktakt, Kopfstoß gibt das gezeigte (Modell `roulette_block_w4`) | `items` ['wachstumsbeere','krallen','funken','stern'], `beats` 1 (Zählzeiten je Symbol), `period` (s, statt Takt), `id`, `hidden`; Laufzeit `item`, `current`, `used`, `given` | `{ kind: 'roulette_block', pos: [-6,3.4,-156] }` |
| `sternring` / `sternmuenze` | wie `roter_ring`: 8 Sternmünzen auf Zeit → Belohnung | `yaw` π/2, `coins` (Liste \| { from, to, n } \| { pos, r, n }), `time` 10, `reward` \| `star`, `retry` true, `id` | `{ kind: 'sternring', pos: [6,1,-188], coins: { pos: [6,1.3,-194], r: 3 }, star: 1 }` |
| `ameisenweg` | benannter Ameisenpfad über Boden/Wände (+ Spur) | `path` (antpath) \| `over: { pos, size }` \| `around: { pos, size }`, `along` 'z', `at`, `from`, `to`, `loop`, `round` 0.35, `show` true, `color`, `every`, `id` → `{ path, L, loop, data, at(s), place(root, s, dir) }` | `{ type: 'ameisenweg', id: 'wand1', over: { pos: [0,1,-250], size: [6,4,2] }, at: 1 }` |
| `deco_w4` | Kulisse (verschmolzen) | `items: [{ kind, pos, … }]`, `shadow: false`; Canyon `felsnadel(n), tafelberg, canyonwand, geroell, trockenbusch/-buesche`, Giftwald `giftbaum/-baeume, leuchtpilze, ranken, sumpfgras`, Technik `antenne, lautsprecher, neonbogen, kabel`, Bergwiese `wiesenblumen, bergfichte(n), heuballen, zaun, windrad`, Ruinen `saeule(n), ruinenbogen, ruinenmauer, statue, truemmer`, Lavaburg `fackel(n), kette(n), burgzinne, banner, lavasteine`; Modell-Arten s. „Modelle“ (`canyon_bogen, ameisenhuegel, ameisenhoehle, giftpilz(e), liane, giftwasserfall, lavafall, neon_ring, equalizer_saeule, wolkeninsel, ruinen_treppe, fallgitter, festungsgitter`) | `{ type: 'deco_w4', items: [{ kind: 'saeulen', from: [-11.5,1,-108], to: [-11.5,1,-124], every: 4 }] }` |

### Präzisierung (Bausteine Welt 4): Themen

| Thema | Stimmung | Kulisse (`buildBackdrop`) |
| --- | --- | --- |
| `canyon` | Abendrot: violetter Zenit, glühender Orange-Horizont, tiefe warme Sonne; goldgrünes Gras auf rot gebändertem Fels | geschichtete Canyonwände und Felsnadeln, Tafelberge, trockenes Flussbett (2 Meshes), kreisende Geier (1 Instanz-Gruppe) |
| `poison` | lila-grüner Giftwald im Dämmerlicht, dichter lila Dunst, grünliches Licht, Moos auf violetter Erde | knorrige Giftbäume, Leuchtpilze (Glow), lila Giftsumpf tief unten (3 Meshes), aufsteigende Sporen (Punkte) |
| `beep` | dunkelblauer Technik-Himmel bei Nacht, Sterne; helle Metallplatten im 1-m-Raster mit Neon-Kante | Neon-Türme, Neon-Gitter tief unten, **Takt-Lichter** (Neon-Ringe in der gerade festen Piep-Farbe, blitzen je Zählzeit, flackern in der Warnzeit) |
| `bounce` | heller Sommerhimmel über Bergwiesen, weiße Wolken | Wiesenhügel und Schneeberge, Blumentupfen, schwebende Heißluftballons |
| `ruins` | warme Ruinenstadt am goldenen Nachmittag, schwebender Staub | Säulen, Bögen, bröckelnde Türme, Dschungelbäume, Staub (Punkte) |
| `lavacastle` | Lava-Burg: tiefroter Rauchhimmel, Glut; Stimmung `innen` (Gewölbe, naher Rauch, Licht von unten) | Lavasee, Burgmauern mit Zinnen, glühende Fenster, Türme, aufsteigende Funken; Fackeln/Ketten über `deco_w4` |

`lava` (4-A), `fortress` (4-B) und `house` (4-Haus) bleiben unverändert. Die Canyonwerkstatt lässt sich mit
`?course=0-14&theme=<name>` in jedem Thema ansehen.

### Präzisierung (Bausteine Welt 4): Welt 4 – Gimmick → Baustein

| Level | Gimmick laut Bauplan | Bausteine |
| --- | --- | --- |
| 4-1 | Canyon, Ameisen laufen an Wänden und tragen die Figur, Stachelfeld, Röhre zum Ziel | `ameisenweg` (Pfade für die Ameisen-Gegner), `deco_w4` (Canyon), Motor-`stachelboden`, `pipe`, Thema `canyon` |
| 4-2 | Giftsumpf, Röhre, Warp-Box, Roulette-Block, bewegliche Plattformen über Gift, Giftwasserfall mit Welt-Warp dahinter, Sternring | `giftwasser` (`flow`), `giftfall` (`kill: false` als Vorhang vor dem Geheimgang), `roulette_block`, `mover`, `sternring`, `deco_w4` (Giftwald), Thema `poison` |
| 4-3 | Piep-Block-Reihen, -Treppe (30 m hoch), Rutsche aus Piep-Blöcken, Druckfelder für Klone | `piep_block` (`map`/`grid`/`blocks`), `piep_treppe`, `piep_rutsche`, Musik `course_beep`, Thema `beep`; Druckfelder: `switchtiles`/`farbfeld` |
| 4-4 | Pilztrampoline, orange Trampoline, Riesentrampolin-Fahrt, Warp-Box auf einer Wolke | `trampolin_orange`, `pilztrampolin`, `riesentrampolin` (`path`), `cloud`, `warpbox`, `deco_w4` (Bergwiese), Thema `bounce` |
| 4-5 | Ruinenstadt, bewegliche Plattformen, drehende Stachelstangen auf Plattformen, schwankende Plattform (Stern 3) | `stachelstange` (`attach`), `mover`, `schwankplattform`, `deco_w4` (Ruinen), Thema `ruins` |
| 4-Burg | Hang, Druckfelder lassen Brücke fallen, 3 Drehplattformen über Lava, roter Ring, Glasrohr durch die Lava, Lavafälle | `drehplattform` (`style: 'lava'`), `lava`, `lavafall`, `lavarohr`, `roter_ring`, `fallplatform`/`switchtiles`, `deco_w4` (Lavaburg), Thema `lavacastle` (`setMood('innen')`) |

## Präzisierung (Gegner Welt 4)

Ergänzung des Gegner-Agenten Welt 4 (Stand: Gegnerzoo Canyon `0-15`, Thronsaal des Lavafelsen-Königs `0-16`). Nichts
oben Festgelegtes wird geändert. Level-Bauer schreiben nur Daten; alle Felder sind optional, sofern nicht anders
vermerkt. Gemeinsame Felder und Konter aus „Präzisierung (Gegner/Power-ups)“, „(Gegner Welt 2)“ und „(Gegner Welt 3)“
gelten weiter (`id, pos, dir|yaw, path, loop, wake, edges, drop`; Ziel = nächste Figur, Lava/Absturz = besiegt,
`STRONG` = cannon, bomb, mega, star; Schwanzhieb = `claw` mit `attackInfo.style 'tail'`; Statue ist für Gegner
unsichtbar; Giftwasser lässt Gegner versinken – Baustein `giftwasser`).

### Präzisierung (Gegner Welt 4): Dateien

```
src/course/entities/EnemyW2.js              + modelInstances(level, name, opts, n) (n Kopien eines Registry-Modells als
                                              Instanzen, gleiche Pose), sharedModelSlot(level, name, opts, state) (ein
                                              Platz je Gegner in einer gemeinsamen Gruppe je Level)
src/course/entities/kinds/ameisen_w4.js     ameisensoldat, ameisensoldat_horn, riesenameise (+ intern …_strom = Spawner)
src/course/entities/kinds/rankenschnapper.js
src/course/entities/kinds/lava_w4.js        lavabrocken, lavafunke
src/course/entities/kinds/walzen_w4.js      walzenwerfer, stachelwalze, stachelpanzer, springklotz
src/course/entities/kinds/kaefer_rad.js     flatterkaefer_rad (Glieder = gewöhnliche flatterkaefer)
src/course/entities/kinds/lavafelsen_koenig.js  lavafelsen_koenig (Boss), feuerbrocken
src/course/entities/kinds/figuren.js        + weightsOn(level, owner): Gegenstände mit `weight` (Lavabrocken) zählen
                                              auf Druckfeldern (pfeld) wie Figuren (eine Zeile in PField.update)
src/course/levels/w0/0-15.js                Gegnerzoo Canyon (10 Gehege, Ameisenwand mit ameisenweg, Stachelfeld,
                                              Giftwasser-Tümpel, Lavabecken, Druckfeld; Z(r, dz))
src/course/levels/w0/0-16.js                Lavafelsen-König-Arena (Archetyp boss, Käfig r 11, Stern + Warp-Box → Ziel)
tests/course_w4_enemies.mjs                 Port 4262 (W4_PART=zoo|boss), Bilder tests/out/w4en_*.png
```

Ameisenpfade kommen aus `blocks/antpath.js` (Bausteine Welt 4): `resolveAntPath`, `antPathAt`, `antOrient`.

### Präzisierung (Gegner Welt 4): gemeinsame Regeln

- **Tragen (Ameisen, Riesenameise):** Rücken bzw. Deck sind Einweg-Quader mit `mover` (wie bewegte Plattformen): wer
  darauf steht, fährt mit – auch die Wand hinauf (an der Wand ist die Oberseite das obere Körperende, 0,62 m tief) und
  über Kanten. Die Riesenameise dreht Mitfahrer an Pfadecken mit (`dyaw`). Gegner können ebenfalls mitfahren.
- **Landen statt Draufspringen:** Eine Figur, die auf einem Reit-Quader landet (Zustand `land` in diesem Schritt), löst
  den Konter des Gegners aus (Ameisensoldat am Boden: platt + Abprall; Hörner-Ameise am Boden: Horn verletzt); wer schon
  draufsteht oder an Wänden landet, fährt mit. Stampfattacke auf den Rücken ruft `onPound` (Motor).
- **Werfen (Lavabrocken):** Tragen-System wie Rollpilz (`carryable`, `canCarry`, `onPickup`, `onThrow`, `onDrop`);
  geworfen trifft er Gegner (`onHit('throw', brocken)`) und Endgegner mit `boss: true` (dieselbe Art, Quelle
  `kind === 'lavabrocken'`), leichte Zielhilfe (≤ 25°) zu einem Endgegner in ≤ 11 m im 35°-Kegel.
- **Druckfelder:** `pfeld` zählt Figuren + `weightsOn` (Entitäten mit `weight > 0`, am Boden auf dem Feld, nicht
  getragen). Ein Lavabrocken auf einem Druckfeld bleibt betäubt liegen, bis man ihn aufhebt.
- **Giftwasser/Lava:** Rankenschnapper, Lavafunke, Riesenameise, Stachelwalze tragen `flying = true` (versinken nicht
  im Giftwasser); der Lavafelsen-König ist lavafest; alle anderen werden besiegt (versinken bzw. verglühen).
- **Instanzen:** Ameisen (je Art eine Instanz-Gruppe, Lage als Quaternion), Riesenameisen (`sharedModelSlot`),
  Flatterkäfer-Räder (`modelInstances`, ein besiegtes Glied bekommt für den Absturz sein Modell zurück), Feuerbrocken
  (eine Instanz-Gruppe je Level). Gruppen weit weg (> Schattenreichweite + 22 m) werden nicht gezeichnet.

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| ameisensoldat | marschiert auf Ameisenpfad (Boden/Wand/Decke, Kolonnen, Strom) oder frei; trägt Figuren | Draufspringen am Boden (Abprall), Stampfattacke, alle Angriffe, Lava/Gift | seitlich, von unten |
| ameisensoldat_horn | wie oben, Horn | **nicht von oben** (Horn verletzt; an Wänden: mitfahren), Feuer, Wurf, Krallen/Schwanzhieb, Panzer, Biss, Faust, Stampfwelle daneben, Rutschen, STRONG | seitlich, von oben (Boden) |
| riesenameise | Laufuntergrund (Deck 1,25 m), Strom aus einer Höhle | unbesiegbar, harmlos | – |
| rankenschnapper | Ranke wächst über den Weg und zurück (Zyklus/fest/bei Nähe), Kopf schnappt; **Körper begehbar**, **Kopf von oben = Abprall** | **Stampfattacke auf den Kopf**, Feuer, Krallen/Schwanzhieb, Wurf, Panzer, Biss, Faust, STRONG (hp) | Kopf seitlich (Biss) |
| lavabrocken | watschelt/folgt, holt aus (0,45 s), stürmt (5 m/s); **betäubt tragbar/werfbar** | betäubt + Stampfattacke, Wurf, STRONG, Lava/Gift; Krallen/Faust/Rutschen/Panzer/Biss/Stampfwelle betäuben; **Feuer prallt ab** | seitlich (wach) |
| lavafunke | springt im Takt aus der Lava (Reihen versetzt) | nur Stern/Riese/Explosion | jede Berührung in der Luft |
| walzenwerfer | (auf Säule) holt Stachelwalze aus dem Maul, wirft im Takt; zielt auf die Figur oder fest | Draufspringen, Stampfattacke, alle Angriffe (Säule bleibt) | seitlich |
| stachelwalze | rollt, hangabwärts schneller (lenkt bergab), zerbricht an Wänden/Lava/Gift/nach life | nur STRONG (**Stampfattacke nicht**) | jede Berührung |
| stachelpanzer | läuft/folgt | Feuer, Wurf, Panzer, Biss, STRONG; Stampfwelle daneben → Rücken, dann jede Berührung | seitlich und **von oben** |
| springklotz | federnder Klotz (Sprungfeder, optional hüpfend) | Feuer, Krallen, Wurf, Panzer, Faust, Biss, STRONG | – (stößt seitlich weg) |
| flatterkaefer_rad | count Flatterkäfer auf einem drehenden Kreis | je Glied wie Flatterkäfer (Draufspringen, alles) | Glieder seitlich |

### Präzisierung (Gegner Welt 4): Gegner-Daten (exakt, mit Beispiel)

```js
segments: [
  // Ameisenpfad als Baustein (Spur), Ameisen lesen ihn per Id – Format siehe „Präzisierung (Bausteine Welt 4)“
  { type: 'ameisenweg', id: 'wand1', over: { pos: [11.5, 1, -16], size: [6, 4, 2] }, along: 'z', at: 13 },
],
enemies: [
  // Ameisensoldat / Hörner-Ameise: antpath | path ([[x,y,z,nx,ny,nz], …] | { path, loop } | 'id' eines ameisenweg),
  //   loop (für Listen), mode 'pingpong' (Standard) | 'loop' (Rundweg) | 'once' (am Ende verschwinden), speed 1.5,
  //   phase 0..1, back false (startet rückwärts), count 1, spacing 1.5 (m entlang des Pfads), ride 'wall' | true | false,
  //   ohne Pfad: pos + dir (läuft frei, Umkehr an Kanten/Wänden),
  //   spawner { every 2.5, max 6, first 0, prefill true } (Strom: neue Ameisen am Pfadanfang, mode 'once')
  { kind: 'ameisensoldat', antpath: 'wand1', speed: 1.5 },
  { kind: 'ameisensoldat', id: 'kolonne', count: 4, spacing: 1.7, antpath: { loop: true, path: [[-16,1,-11], [-7,1,-11], [-7,1,-17], [-16,1,-17]] } },
  { kind: 'ameisensoldat_horn', antpath: [[-16, 1, -14], [-7, 1, -14]], speed: 1.3 },
  { kind: 'ameisensoldat', ride: true, antpath: [[-16, 1, -20], [-7, 1, -20]] },          // Träger-Ameise
  { kind: 'ameisensoldat_horn', spawner: { every: 1.5, max: 4 }, antpath: [[0, 1, -40], [0, 1, -52]], speed: 2 },  // aus einer Röhre
  // Riesenameise: path [[x,y,z], …] (y = Boden), speed 2, loop, mode 'pingpong' | 'loop' | 'once', phase, wait 0.4;
  //   Strom: spawner true | { every 3.5, max 8, first 0, prefill true } (verschwindet am Pfadende in 0,8 s)
  { kind: 'riesenameise', spawner: { every: 3.6, max: 6 }, path: [[-5.6, 1, -35], [-18, 1, -35]], speed: 2 },
  // Rankenschnapper: pos = Wurzel; path [[x,y,z], …] (Welt, ab der Wurzel) | dir + length 4.5 + height 1.45 (+ hang),
  //   mode 'cycle' | 'static' | 'sense' (sight 7), grow { out 1.4, hold 2.4, back 1.2, wait 1.6 } | [out, hold, back, wait],
  //   min 0.12, phase 0..1, reach 2.2, walk true, size 1, hp 1
  { kind: 'rankenschnapper', pos: [6.2, 1, -31], dir: [1, 0], length: 7.5 },
  { kind: 'rankenschnapper', pos: [9.5, 1, -39], dir: [1, 0], length: 2.8, height: 1.7, mode: 'static' },   // Stufe
  { kind: 'rankenschnapper', pos: [16.5, 4.6, -35], hang: true, dir: [-1, 0], length: 3.8, height: 1.2, mode: 'sense' },
  { kind: 'rankenschnapper', pos: [0, 1, -60], path: [[0, 1, -60], [0, 3, -60], [2, 3.4, -62], [6, 3.4, -62]], size: 1.6, hp: 3 },
  // Lavabrocken: behavior 'chase' | 'walk', speed 1.2, chaseSpeed 1.8, sight 7, charge true, chargeSpeed 5, stun 6,
  //   vel [vx,vy,vz] (startet im Flug), owner, path/loop/dir/wake/edges/drop
  { kind: 'lavabrocken', pos: [-9, 1, -57] },
  // Lavafunke: pos = Lava-Oberfläche, height 4, period 2.6 (s, Level-Uhr), phase 0..1, count 1, spacing 1.6, dir [1, 0],
  //   stagger 0.12 (Takt-Versatz je Glied)
  { kind: 'lavafunke', pos: [7, 1.3, -75], count: 5, spacing: 2.1, height: 3.4, period: 2.4, stagger: 0.14 },
  // Walzenwerfer: pos = Fuß der Säule, pillar 0 (Säulenhöhe, fest + begehbar), dir|yaw, aim 'player' | 'dir', sight 16,
  //   interval 2.2, first 0.8, walze 0.85 (Größe), speed 3.5 (Walze), throwSpeed 4.5, life 12, max 3
  { kind: 'walzenwerfer', pos: [11.5, 1, -60], pillar: 2.6, dir: [0, 1], aim: 'dir', interval: 2.6 },
  // Stachelwalze (auch einzeln, z. B. 4-Haus „Bröckelblöcke mit rollenden Walzen“): pos (Boden), dir, size 0.85,
  //   speed 3.5, vel, life 12, owner
  { kind: 'stachelwalze', pos: [0, 4, -90], dir: [0, 1], size: 1.2 },
  // Stachelpanzer: speed 1.2, behavior 'walk' | 'chase', sight 6, chaseSpeed 1.8, up 4, path/dir
  { kind: 'stachelpanzer', pos: [-15, 1, -72], path: [[-16, 1, -72], [-10, 1, -72]] },
  // Springklotz: strength 18 (Abprall m/s; ≈ 6 m über der Oberkante), hop false, every 1.8, hopDist 1.2, dir
  { kind: 'springklotz', pos: [-6.5, 1, -76] },
  // Flatterkäfer-Rad: center|pos, count 8, radius 3, speed 1.8 (m/s am Umfang), cw, plane 'xy' | 'zy' | 'xz', phase,
  //   color 'pink'; Glieder level.named `${id}_${i}`
  { kind: 'flatterkaefer_rad', id: 'rad', center: [-11.5, 5.2, -95], count: 8, radius: 3 },
  // Vorhandene im Welt-4-Einsatz: feuer_werfer weapon 'bumerang' (4-3), pilzlingsturm, rollpilz, stampfstein, suchkopf
  //   (kanone_turm shot 'suchkopf'), riesenprojektil – Felder wie in den Präzisierungen Welt 1–3
],
items: [
  { kind: 'pfeld', pos: [-14.5, 1, -59], need: 1, on: { coins: 3 } },   // Lavabrocken daraufwerfen löst aus
],
```

### Präzisierung (Gegner Welt 4): Lavafelsen-König

```js
{ kind: 'lavafelsen_koenig', id: 'koenig', pos: [0, 2, -3] (Start), arena: { center: [0, 2, 0], r: 10.4 }, hp: 3,
  roll: [5, 6, 7], rollTime: [2.6, 2.8, 3.0], rest: [1.8, 1.5, 1.2], summon: [2, 2, 3], max: [3, 3, 4],
  sparks: [6, 8, 10] (je Treffer), spin: 2.0, burn: 2.6, star: { pos: [0, 2.4, 6.5], index: 0 }, wakeR: 9, drop }
boss: { id: 'koenig', name: 'Lavafelsen-König', speed: 0, trigger, warp: 'warp_sieg', warpPos, warpTo, frame: 0.3 }
```

Ablauf: `wait` → `intro` (2,2 s, Brüllen) → Runde: `summon` (1,4 s; bei 0,6 s springen Lavabrocken aus dem Boden – 2 / 2
/ 3, aufgefüllt bis 3 / 3 / 4 gleichzeitig: **endlos**) → `roll` (2,6 / 2,8 / 3,0 s Felskugel 5 / 6 / 7 m/s auf die
nächste Figur zu, lenkt ≤ 1,6 rad/s, prallt an der Arenagrenze r − 1,15 und an Wänden ab) → `rest` (1,8 / 1,5 / 1,2 s)
→ `summon` … **Schaden nur durch einen geworfenen Lavabrocken** in `summon`/`roll`/`rest`: `hit` (0,6 s) → `spin`
(2 s, Fäuste verletzen im Umkreis 1,7 m, verstreut 6 / 8 / 10 **Feuerbrocken**, die landen, 2,6 s brennen und
verlöschen) → nächste Runde. Draufspringen = Abprall ohne Schaden; Feuer, Kanonenkugel, Bombe, Stern, Riese, andere
Würfe zählen nicht; Berührung (außer von oben) verletzt. 3 Treffer → `defeated` (2,6 s) → `gone` (gerufene Brocken und
Feuerbrocken zerfallen, Stern erscheint; Archetyp: Warp-Box). Ansagen: „Wirf Lavabrocken auf ihn!“ (erster Ruf),
„Er rollt schneller!“ (Phase 2), „Jetzt wird es heiß!“ (Phase 3); die Standardtexte des Archetyps werden ersetzt.
Tod im Kampf: Neustart, König 3/3 am Start, Brocken/Feuerbrocken weg. Schnittstelle wie Wirbelbrocken (`begin, reset,
state, stateT, hp, maxHp, phase, visible, home, half, carHits 0, vulnerable, info()`, `level.onBossHit(boss,
'brocken')`, `level.onBossDefeated`), `boss: true`, kein `enemy`.

### Präzisierung (Gegner Welt 4): Hinweise für Level-Bauer

- Wände für Ameisen achsenparallel bauen (`ameisenweg` `over`/`around` oder eigene Listen mit Normalen); die Reit-Quader
  sind achsenparallele Hüllen – Diagonalen funktionieren, sind aber breiter. Auf Decken (Normale −Y) tragen Ameisen nicht.
- Riesenameisen-Strom: Pfad in einer Höhle beginnen und enden lassen (Erscheinen 0,6 s, Verschwinden 0,8 s); das Deck
  ist 2,15 × 1,35 m, Oberkante 1,25 m über dem Pfad – Abstand der Tiere = speed · every.
- Rankenschnapper: Lauf-Quader nur auf flachen Rankenstücken (Steigung < 0,8); als Stufen `mode: 'static'` mit
  verschiedenen `height`. Wurzel darf im Giftwasser/Wasser stehen.
- Walzen rollen hangabwärts (Rampen) und zerbrechen an Wänden ≥ Stufenhöhe; eine Mauer am Hangfuß begrenzt sie.
- Lavabrocken-Rätsel (4-Burg Stern 1/2): `pfeld` mit `group` – ein Brocken auf einem Feld hält es, die Figur drückt das
  andere. 4-A: Arena mit `lavabrocken` (Brocken in die Lava stoßen/werfen zählt als besiegt).

### Präzisierung (Gegner Welt 4): Tests und Kennzahlen

`tests/course_w4_enemies.mjs` (Port 4262, `?course=0-15|0-16&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`;
Hilfen `window.__t`: `Z(r, dz)`, `place`, `stomp`, `side`, `touch`, `moveTo`, `action`, `face`, `safe`, Boss: `enter`,
`untilSafe`, `grab`, `throwAtBoss`): Ameisen (Kolonne auf Rundweg mit 1,7 m Abstand, freie Ameise, seitlich = Treffer,
Draufspringen besiegt, Hörner von oben verletzt/Feuer besiegt, Träger-Ameise trägt, Stampfattacke besiegt, Strom aus
einer Röhre), **Ameise trägt die Figur die Wand hinauf** (1,8 → 5,9 m) und über die Kante, Hörner-Ameise an der Wand
trägt, Riesenameisen-Strom (gefüllt, endlos, trägt die Figur über das Stachelfeld ohne Schaden), Rankenschnapper (wächst
0,12 → 1 und zurück, wurzelt im Giftwasser, begehbar, Figur fällt beim Zurückziehen, schnappt, Biss, Abprall vom Kopf,
Stampfattacke besiegt, Stufe, Feuer, hängend bei Nähe), Lavabrocken (verfolgt, holt aus, stürmt, betäubt, Feuer prallt
ab, aufheben/werfen besiegt eine Zielscheibe, aufs Druckfeld geworfen löst es aus und bleibt liegen, Stampfattacke,
Lava), Giftwasser (Brocken und Ameise versinken), Walzenwerfer (Takt, Walze rollt hangabwärts schneller und zerbricht an
der Mauer, Stampfattacke zerstört sie nicht, Kanonenkugel schon, zielt auf die Figur, besiegt, Säule bleibt),
Stachelpanzer, Springklotz (≈ 7 m hoch), Lavafunken (Takt 2,4 s, Versatz 0,14 Takt, Höhe 3,4 m), Flatterkäfer-Rad
(Drehung, Glieder auf dem Kreis, besiegtes Glied fällt), Bumerang-Werfer, großer Rankenschnapper (3 Treffer), echter
Schwanzhieb des Gleitblatts, Statue (Verfolger hört auf), Klone (Brocken, Werfer, Träger-Ameise, Rankenschnapper, Boss),
Boss vollständig (Ruf, Rollen, nur geworfene Brocken treffen, nicht im Wirbel, Feuerbrocken 6 + 8 + 10, Ansagen, Sieg →
Stern + Warp → Ziel, Tod setzt zurück) – 60 (Zoo) + 16 (Boss) Prüfungen; `W4_PART=zoo|boss` führt einen Teil aus (je
≈ 4 bzw. 3 min). Gemessen (scale 2, inkl. Schattenpass, Thema canyon/lavacastle): Gegnerzoo 82–116 Zeichenaufrufe je
Station (≤ 331 k Dreiecke), Boss-Arena 54–104 (≤ 178 k); Simulation im Zoo (≈ 51 Entitäten) 0,11–0,14 ms je Schritt.

---

## Musik-Richtlinie (Auftraggeber, verbindlich für alle Welten)

Rückmeldung des Auftraggebers: Die Musik ab Welt 2 war „nicht melodisch“ – **alle** Kurs-Themen sollen wie Welt 1
klingen: 90er-Eurodance (eigene Kompositionen im Geist von 2 Unlimited), **melodisch und eingängig**. Maßstab sind die
Welt-1-Themen in `src/audio/themes.js` (`course_grass`, `course_cave`, `course_circus`, `course_river`, `course_boss`,
`course_arena`, `course_diorama`, `course_map`, `world1`):
- Liedform: Intro → Strophe → **Refrain mit klarer, singbarer Hook** (Lead-Synth/Piano führen die Melodie fast
  durchgehend) → Überleitung; 16–32 Takte, Loop.
- Harmonik: klassische Eurodance-Folgen in Dur/Moll (z. B. I–V–vi–IV, vi–IV–I–V, i–VI–III–VII, i–iv–VII–III);
  exotische Skalen höchstens als Farbe, nicht als Grundlage.
- Typische Spuren: Off-Beat-Stabs, Piano-Akkorde, Pad, hüpfender Oktav-Bass, Four-on-the-floor; Hoover sparsam als
  Akzent. 128–150 BPM.
- Welt-Charakter über Klangfarben/Percussion (z. B. Darbuka in der Wüste, Glöckchen im Schnee), nie auf Kosten der
  Melodie.

## Welt 5 – Level-Liste und Freischaltung (Hauptsitzung)

Welt 5 „Lila Strand-Insel“ wird nach Sieg über `4-Burg` frei (oder früher über den Welt-Warp in 4-2). Sternbedarf zählt
**alle** gesammelten Sterne (Welt 1–4 bieten zusammen 109).

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `5-1` | parcours + ride (Strand, 5 Schlüsselmünzen öffnen die Warp-Box, Pflaume im Höhlenfluss) | beach | course_beach | 3 + Stempel | Welt 5 offen |
| `5-2` | parcours (Zirkus: Trapeze zum Schwingen, Seilbahnen, Pendelplattformen) | circus | course_trapeze | 3 + Stempel | 5-1 |
| `5-3` | parcours kurz (100 s, unterirdisch, blaue Lava, 3er-/4er-Lifte, Spiegelfrüchte) | bluelava | course_bluelava | 3 + Stempel | 5-2 **und ≥ 90 Sterne** |
| `5-A` | arena (Käfig, 5 Rammbock-Bullen) | grass | course_arena | 1 | 5-2 |
| `5-4` | parcours offen (Savannenberge, Röhrenkanone, Hasen) | savanna | course_savanna | 3 + Stempel | 5-2 |
| `5-Kapitän` | diorama (Geisterhaus, Kreisgeister, Tipp- und Donut-Blöcke) | ghost | course_diorama | 5 | 5-4 |
| `5-5` | parcours (Höhle, Zündköpfe, POW-Blöcke, lila Ziegelwand) | mine | course_mine | 3 + Stempel | 5-4 |
| `5-B` | arena (Lava, steigende Steinsäulen, Feuer-Werfer auf Pilzlingsturm, 100 s) | lava | course_arena | 1 | 5-5 |
| `5-6` | parcours (Torten-Welt, Rot-Blau-Flipper wechseln bei jedem Sprung, Feuerringe) | cake | course_cake | 3 + Stempel | 5-5 |
| `5-7` | parcours (Schleich-Festung: Suchscheinwerfer, entdeckt → Suchkopf-Welle) | sneak | course_sneak | 3 + Stempel | 5-6 |
| `5-Zug` | autoscroller (Bonus: Goldzug voller Münzen, Glückshaus am Ende) | train | course_goldtrain | 0 | 5-7 |
| `5-Burg` | parcours + boss (Ruinen-Tempel mit Kippquadern, Boss Kippquader-König) | temple | course_temple | 3 + Stempel | 5-7 **und ≥ 100 Sterne** |

Welt 5 hat 31 Sterne. „Kapitän“ = Krümel, „Münz-Dieb“ = Münzmarder, „Pilzkopf-Figur“ (Figurenschalter 5-3) = Lotti
bzw. Greta, „Reittier“ = Pflaume. Neu: Schlüsselmünzen, Trapez, Röhrenkanone, Drehbrücke, Rot-Blau-Flipper,
Schiebekugel (auf P-Feld bugsieren), Suchscheinwerfer, Kippquader, Donut-Block; Gegner Sandtaucher, Zündkopf,
Feuerring, Hackbeil-Pilz, Funkenling, Glutball; Boss **Kippquader-König** (nur Sprung auf den Rücken trifft).

## Präzisierung (Motor und Bausteine Welt 5)

Ergänzung des Motor-/Bausteine-Agenten Welt 5 (Stand: Strandwerkstatt `0-17`). Nichts oben Festgelegtes wird geändert;
alle Ergänzungen sind additiv. Alle Welt-5-Mechaniken sind parametrierbare Module, Level-Bauer setzen sie nur in Daten
ein. Jede Datei dokumentiert ihre Parameter vollständig im Kopfkommentar; hier die Felder mit Beispielen. Aktionen im
bekannten Format (Präzisierung Sonder-Bausteine) plus **`{ signal: name }`** (s. u.). Alle Bausteine sind über eine
Hülle auch als `kind` in `items`/`enemies` erlaubt und die beiden Entitäts-Gimmicks auch als `type` in `segments`.

### Präzisierung (Motor und Bausteine Welt 5): Dateien

```
src/course/player/swing.js              Trapez-Schwingen der Figur (tryGrabTrapeze, trapezeCtl, pendulumStep, SWING)
src/course/player/Player.js             + level.notifyJump bei jedem Absprung, Trapez greifen in der Luft,
                                        ride(ctl, { solo }) (solo: Klone folgen nicht), camTrack
src/course/player/Squad.js              Klone reisen nur bei ride ohne solo mit (Röhrenkanone ja, Trapez/Kippquader nein)
src/course/player/fencing.js            + notifyJump('fence')
src/course/player/HeroRig.js            + Zustände 'trapeze' (Neigung um swingTilt) und 'cannon' (proxy.course)
src/course/level/Level.js               + onJump/notifyJump/jumps, signal/onSignal/signals
src/course/entities/gimmick.js          + Aktion { signal: name | [names] }
src/course/view/CameraRig.js            + player.camTrack (schnelles Nachführen, Röhrenkanonen-Flug)
src/course/archetypes/kinds/ride.js     + Archetyp 'parcours_ride' (Ritt-Abschnitt), Kamera-Übergabe
src/course/archetypes/RideController.js + Abschnitt-Modus (Station, Strand), level.rideObstacles (Brücken)
src/course/archetypes/RideCamera.js     + adopt(rig, p) / handOver(rig)
src/course/archetypes/RideRig.js        + opts { section, swim, after } (zu Fuß normale Heldin, Pflaume schwimmt)
src/course/blocks/w5kit.js              landingHint, keyHud, modelOr, rot90
src/course/blocks/types/w5_circus.js    trapez, pendelplattform
src/course/blocks/types/w5_savanna.js   roehrenkanone, drehbruecke
src/course/blocks/types/w5_flipper.js   flipper (Feld-Raster, Wechselplattformen; System level.flipper)
src/course/blocks/types/w5_temple.js    kippquader
src/course/blocks/types/w5_donut.js     donutblock
src/course/blocks/types/w5_sneak.js     suchscheinwerfer
src/course/blocks/types/w5_river.js     flussbruecke (Hubbrücke über dem Ritt-Fluss)
src/course/blocks/types/w5_misc.js      schluesselmuenze, schiebekugel, schluesselmuenzen als segments-type
src/course/blocks/types/lava.js         + color: 'blau' (bzw. Thema lavaColor)
src/course/blocks/types/deco_w5.js      Kulisse Welt 5 (verschmolzen; shadow: false für ferne Kulisse)
src/course/entities/kinds/w5_gimmicks.js  schluesselmuenze, schiebekugel + kind-Hüllen der Welt-5-Bausteine
src/course/view/theme_beach|bluelava|savanna|mine|cake|sneak|temple.js, backdrop_w5.js   Themen + Kulissen
src/course/levels/w0/0-17.js            Strandwerkstatt (eine Station je Mechanik, marks für den Test)
tests/course_w5_blocks.mjs              Port 4390, Bilder tests/out/w5b_*.png (je Thema w5b_thema_*.png)
```

Additiv geändert: `view/themes.js` (7 Registrierzeilen, `??=`). `src/three/*`, Modelle, Audio und Karte bleiben
unverändert.

### Präzisierung (Motor und Bausteine Welt 5): Sprung-Ereignis, Signale, Kamera

- **Sprung-Ereignis:** `level.onJump(fn(fig, kind)) → abmelden`; jede Figur (auch Klone) meldet jeden Absprung über
  `level.notifyJump(fig, kind)`; `level.jumps` zählt. `kind`: `'jump'` (Boden, auch Sand/Schlittschuh), `'walljump'`,
  `'stalk'` (Ranke), `'fence'` (Kettenzaun), `'swim'` (aus dem Wasser), `'raft'` (Floß-Hüpfer), `'trapeze'`. Der
  Rot-Blau-Flipper hört darauf (mehrere Figuren im selben Schritt → ein Wechsel).
- **Signale:** `level.signal(name, data)` / `level.onSignal(name, fn(data, name)) → abmelden` (`'*'` = alle),
  `level.signals[name]` = Zähler. Aktion `{ signal: 'alarm' }` (auch Liste) ruft `level.signal(name, { pos, source })`.
  Der Suchscheinwerfer meldet „entdeckt“ standardmäßig als Signal **`'alarm'`** – die Suchkopf-Kanonen des Gegner-Agenten
  hängen sich mit `level.onSignal('alarm', …)` oder `level.named.get(id).onDetect(fn)` daran.
- **Kamera-Nachführung:** `player.camTrack` (1/s, 0 = aus) beschleunigt die Kameraschiene (Ziel und Standhöhe dämpfen
  mit `max(Standard, camTrack)`); die Röhrenkanone setzt im Flug 16 und am Ende 0 (Neustart setzt 0).

### Präzisierung (Motor und Bausteine Welt 5): Avatar-Zustände (HeroRig → `proxy.course`)

Neue Werte von `proxy.course.state` für den Figuren-Agenten (Posen in `src/three/*`; bis dahin Rückfall-Pose):

| state | Bedeutung | Zusatzfelder |
| --- | --- | --- |
| `'trapeze'` | hängt am Trapez: Hände an der Stange über dem Kopf, Körper hängt am Seil. Die Hülle ist schon um die Querachse der Blickrichtung um `player.swingTilt` geneigt (Drehpunkt: Fußpunkt der Hülle, den die Simulation entlang des Seils unter die Stange legt – die Hände liegen dann an der Stange) | `swing` (Seilwinkel rad, + = nach vorn), `swingVel` (rad/s), `phase` (Anteil der Ausschlagsgrenze 0..1) |
| `'cannon'` | Flug aus der Röhrenkanone (gestreckt wie ein Geschoss, Arme vorn). In der Röhre ist die Figur unsichtbar (`player.hidden`, vorher kurz `'pipe'`) | `phase` = Flugfortschritt 0..1 |

Weitere benutzte Zustände sind die bekannten (`'pipe'`, `'ride'`, Mitfahrt auf dem Kippquader = `'fall'`).

### Präzisierung (Motor und Bausteine Welt 5): Trapez (Figur)

Ein Trapez ist ein Pendel (Aufhängung `pos`, Seil `length`, Schwingebene `dir`). Die Figur greift die Stange im Sprung
(Hände ≤ 0,8 m an der Stange; nach dem Loslassen 0,15 s Pause, dasselbe Trapez erst nach 0,6 s) und
hängt im Skript-Modus (`player.ride` mit `solo: true` – Klone greifen selbst) darunter. Stick entlang der Schwingebene
(vor oder zurück) schaukelt auf (Ziel-Ausschlag +26 °/s bis `maxAmp` 66°; mit Figur mindestens `riderAmp` 40°), Sprung
springt ab (Bahngeschwindigkeit der Hände + 5 m/s nach oben + 2 m/s in Schwungrichtung), Ducken lässt fallen.
**Zielhilfe:** liegt in Schwungrichtung ein freies Trapez 3–6,5 m weiter (seitlich ≤ 1,2 m), wird die waagerechte
Geschwindigkeit im Band 0,4–1,8 × Schwung so gewählt, dass die Hände dessen (vorausgerechnete) Stange treffen –
Trapeze für Ketten also **4–5 m auseinander, gleiche Höhe, gleiche Phase**. `SWING` in `player/swing.js` hält alle Werte.

### Präzisierung (Figuren Welt 5): Posen 'trapeze' und 'cannon'

Ergänzung des Figuren-Agenten (additiv; Posen in `src/three/avatars/hero.js`: `poseTrapeze`, `poseCannon`, Arm-IK `reachTo`).
Gilt für Lotti und Greta, groß/klein, Kostüme, Stern, Klone (`lite`).

- **`'trapeze'`:** Der Avatar dreht die Figur **nicht** (die Hülle ist schon um `swingTilt` geneigt), er posiert im Seil-System.
  Liest `swing` (Beine, Kopf, Rock) und `swingVel` (Beine laufen nach, am Umkehrpunkt Knie angezogen); `phase` bleibt ungenutzt.
  Die Fäuste liegen per Arm-IK an der Stange: Stangenmitte = Körperhöhe der Hitbox (0,95 m / klein 0,65 m) + `SWING.arm`
  (0,26 m) − 0,06 m Durchbiegung des Modells `trapez` über dem Fußpunkt (Tabelle `TRAPEZE` in hero.js – bei Änderung von
  `SWING.arm`, `HITBOX` oder der Durchbiegung dort nachziehen). Gemessen: Fäuste 3–4 cm von der Stangenachse, ±0,37 m von der
  Mitte (klein ±0,26 m). Arme gestreckt im weiten V um den Kopf (Gummi-Arme). Riesentrank: Stange in Brusthöhe → die Figur
  hängt 0,45 Avatar-Einheiten hinter der Stange und hält sie vor dem Bauch. Absprung (`'jump'`) bzw. Fallenlassen (`'fall'`)
  direkt aus `'trapeze'` blenden 0,3 s über.
- **`'cannon'`:** Liest `phase`, `speed`, `vy`; die Hülle blickt waagerecht in Flugrichtung (`flightCtl` setzt `yaw`), die
  Körperachse folgt (`speed`, `vy`) (kopfüber höchstens 129°), führende Faust voraus, Beine geschlossen, Rock flattert, Haar
  und Zöpfe wehen über die Physik. Ab `phase` 0,8 Landepose (aufrecht, Arme im V, Beine vor).
- **Neue Pose-Kanäle** (Kurs-Modus, im Klassik-Modus wirkungslos): `reachN/reachF` (Streckung der Kurs-Arme), `armKn/armKf`
  (gleichmäßiger Arm-Maßstab), `skirtX/skirtZ` (Drehung des Rocks). Alle gleichmäßig → Figur-Bündel bleibt.
- **HeroRig:** ausgeschwungene Rest-Stauchung (< 0,2 %) wird genau 0 – sonst war die Hülle bis ≈ 1,7 s nach jeder Landung
  nicht ähnlichkeitstreu und das Figur-Bündel zerfiel (Kanonenflug 18 statt 9 Zeichenaufrufe).
- **Gretas Haar:** runder Schopf mit Strähnen (ein Mesh wie bisher); Grenzkegel im Rumpf-System (liegt auf dem Rücken, auch
  mit Kopf im Nacken), in Saltos enger; das Mesh dreht sichtbar um die Kopfmitte.
- **Test** `tests/posen_w5.mjs` (Port 4360 + `PORT_BASE`; `P5_SHOTS=0`, `P5_HEROES`, `P5_PARTS=trapeze,cannon,extra`,
  `P5_DEBUG=1`): Strandwerkstatt 0-17, Avatar im Takt der Simulation; Bilder `tests/out/posen_w5_*`, Bögen
  `posen_w5_sheet_<heldin>.png`. Kennzahlen: beide Posen 9 Zeichenaufrufe (= idle), Dreiecke wie idle (Lotti 28,6 k, Greta
  24,0 k inkl. Schattenpass; Gretas neues Haar +2,5 k).

### Präzisierung (Motor und Bausteine Welt 5): Ritt-Abschnitt im Parcours

`archetype: 'parcours_ride'` (oder `'ride'` mit `LEVEL.ride.section: true`): Parcours-Level mit einem Flussabschnitt
(Fluss-Bausteine `river` wie 1-4, Präzisierung Ritt/Diorama). Zu Fuß gelten Kameraschiene (`LEVEL.camera`, CameraRig mit
Kollision) und die normale Darstellung der Heldin; an der Station (`raft`, optional `dock`-Zone) steigt sie auf Pflaume,
die Floß-Kamera übernimmt ohne Sprung; am Ende (`beach`-Zone) steigt sie ab (`land`), die Kamera gleitet auf
`footCamYaw` zurück und übergibt. Pflaume **schwimmt** (`swim: true`: kein Blatt-Floß, Paddel-Pose, Körper 0,22 m
eingetaucht) und bleibt am Ende im Wasser (`after: 'stay'`; `'follow'` = hoppelt hinterher wie 1-4). Stirbt die
Figur im Fluss, beginnt sie am letzten Checkpoint; an Land außerhalb der Zonen wartet Pflaume an der Station, bis der
Ritt geschafft ist.

```
ride: { section: true, raft: [x, y, z] (Station, Pflaume wartet im Wasser), raftYaw, dock: { min: [x, z], max: [x, z] },
        beach: { min: [x, z], max: [x, z], land: [x, y, z], raft?: [x, y, z] }, swim: true, after: 'stay', footCamYaw: 0 }
```

Hindernisse für das Floß: Bausteine tragen sich in `level.rideObstacles` ein (`{ box() → { x0, x1, y0, y1, z0, z1 },
hits, id }`); `RideController.collideObstacles()` lässt das Floß davor abprallen (warten). Die `flussbruecke` ist so ein
Hindernis (unten versperrt, oben Durchfahrt).

### Präzisierung (Motor und Bausteine Welt 5): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `schluesselmuenze` (kind; auch type) | goldene Münze mit Schlüssel, HUD „Schlüssel n/N“, alle einer Gruppe → Aktion | `pos`, `group` 'schluessel', `onAll` (Aktion, an irgendeiner Münze der Gruppe), `of` (Standard: Zahl im Level), `id`, `hidden`; `level.keys[group] = { n, of, done }`; HUD `keyHud(level).state()` → `{ group, n, of, done, visible, text }` | `{ kind: 'schluesselmuenze', pos: [-6,1.2,-9], group: 'tor', onAll: { reveal: 'warp1' } }` |
| `schluesselmuenzen` (type) | mehrere auf einmal | `group`, `onAll`, `of`, `coins: [[x,y,z]…]` | `{ type: 'schluesselmuenzen', group: 'tor', onAll: { reveal: 'warp1' }, coins: [[0,1.2,-9],[4,1.2,-9]] }` |
| `trapez` | Trapez zum Schwingen (s. o.) | `pos` (Aufhängung), `length` 3, `dir` [0,−1] \| `yaw`, `swing` 30 (° leer), `phase` 0..1, `width` 1.2, `riderAmp` 40, `maxAmp` 66, `frame` true, `color` 'rot'\|'blau'\|'gold', `hidden`, `id` → `{ theta, omega, rider, grabs, releases, aimed, bar(), reveal(), hide(), info() }`; `level.trapezes` | `{ type: 'trapez', id: 't1', pos: [0,7.2,-84.5], length: 3, swing: 30 }` |
| `pendelplattform` | Plattform am Pendel, bleibt waagerecht, trägt (mover) | `pos` (Aufhängung), `length` 4 (bis Oberseite), `size` [3,2.2], `thick` 0.4, `dir` [1,0] \| `yaw`, `amp` 35, `period` 2π√(L/9,81), `phase`, `idle`, `style` 'zirkus'\|'holz'\|'stein', `id` → `{ theta, top, pos, start(), stop(), info() }` | `{ type: 'pendelplattform', id: 'pendel', pos: [0,7,-108], length: 6, size: [3,2.2], dir: [0,-1] }` |
| `roehrenkanone` | hineinspringen/ducken → laden → hoher Bogen genau auf `to` (≈ 40 m), Kamera folgt | `pos` (Fuß), `height` 2.2, `radius` 1, `to`, `arc` max(6, 0,3·Abstand), `gravity` 30, `charge` 0.55, `enter` 'both'\|'land'\|'crouch', `color` 'gruen'\|'gold'\|'rot', `onFire`, `hidden`, `id` → `{ shots, state ('idle'\|'load'\|'fly'), flightTime, from, to, fire(player), reveal(), hide(), info() }` | `{ type: 'roehrenkanone', id: 'kanone', pos: [0,1,-122.5], to: [0,1,-162.5] }` |
| `drehbruecke` | Brücke dreht um senkrechte Achse (trägt mit, mover.dyaw) | `pos` (Mitte Oberseite), `length` 10, `width` 2.4, `thick` 0.4, `yaw` 0 (0 = entlang X), `mode` 'step'\|'spin'\|'signal', `step` 90, `wait` 2.5, `turn` 1.5, `warnT` 0.6, `speed` 0.5, `dir` 1, `phase`, `post`, `postDown` 8, `style` 'holz'\|'stein', `id` → `{ angle, turns, turning, warn, start(), stop(), toggle(), info() }` | `{ type: 'drehbruecke', id: 'dreh', pos: [0,1,-170.5], length: 11, yaw: Math.PI / 2, wait: 3 }` |
| `flipper` | Rot-Blau-Flipper: aktive Farbe fest, andere durchlässig; jeder Sprung (auch Klon) wechselt | Raster: `pos` (Mitte Oberseite), `grid` [nx,nz], `cell` 2, `gap` 0.12, `thick` 0.35, `map` ['rb.b',…] (Zeilen von +Z nach −Z) \| `pattern` 'checker'\|'rows'\|'cols'\|'rot'\|'blau', `first` 'rot'; Wechselplattformen: `platforms: [{ pos, size: [w,d], color }]`; Start `LEVEL.flipperStart` 'rot'; `level.flipper = { color, flips, start, flip(), set(c), onFlip(fn), solidAt(x,z), info() }`, `id` → `{ tiles, info() }` | `{ type: 'flipper', id: 'felder', pos: [0,1,-190], grid: [4,6], cell: 2 }` |
| `schiebekugel` (kind; auch type) | Kugel schieben/stoßen, rollt aus, zählt auf `pfeld` als Gewicht, Abgrund → zurück | `pos`, `size` 1.6, `weight` 1, `friction` 3.2, `kick` 6, `push` 1, `respawn` 1.2, `color` 'rosa'\|'blau'\|'gold'\|'grau', `id`, `hidden`; Laufzeit `onField`, `rolled`, `resets`, `speed()`, `info()` | `{ kind: 'schiebekugel', id: 'kugel', pos: [-4,1,-213] }` + `{ kind: 'pfeld', id: 'kugelfeld', pos: [4,1,-213], need: 1 }` |
| `suchscheinwerfer` | Lichtfleck fährt Bahn; Figur im Licht (nicht verdeckt) → „entdeckt“: rotes Blinklicht, sfx 'alarm', Ansage, Aktion, Abklingzeit; Fleck folgt der Figur | `path` [[x,y,z]…] (Boden), `speed` 2.5, `radius` 2.2, `mode` 'pingpong'\|'loop', `wait` 0.5, `phase`, `lamp` (Standard 10 m über Bahnmitte, 6 m dahinter in −Z), `post`, `cooldown` 3, `alarmTime` 2, `track` true, `trackSpeed` 3.2, `occlude` true, `onDetect` { signal: 'alarm' }, `banner` 'Entdeckt!', `color`, `idle`, `id` → `{ spot, lamp, radius, seen, alarm, alarms, lastSeen, onDetect(fn(info)), start(), stop(), sees(fig), info() }`; `level.searchlights` | `{ type: 'suchscheinwerfer', id: 'licht', path: [[-8,1,-224],[8,1,-224]], lamp: [-2,10,-231] }` |
| `kippquader` | kippt über die Kante auf Raster-Bahn, Warnung + roter Landeboden-Hinweis, Treffer beim Aufschlag, begehbar, nimmt Reiter mit; Rahmen mit Loch | `pos` (Mitte unten), `size` [2,4,2], `hole` [w,h], `steps` ['-z','-z'] ('±x'\|'±z'), `mode` 'pingpong'\|'loop'\|'once', `wait` 1.2, `turn` 0.55, `warn` 0.7, `phase`, `start` 'auto'\|'near'\|'signal', `near` 9, `hint` true, `style` 'tempel'\|'stein', `face` true, `id` → `{ state, tips, hits, carried, box, boxes, nextRects(), tip(dir), start(), stop(), hint, onLand(fn(boxes)), info() }` | `{ type: 'kippquader', id: 'kq1', pos: [-5,1,-241], size: [2,4,2], steps: ['-z','-z'] }` |
| `donutblock` | fällt kurz nach dem Betreten (trägt mit), kommt wieder | `pos` \| `blocks` \| `from`/`to` \| `grid`+`pos`, `size` 1, `delay` 0.5, `respawn` 3, `life` 2.2, `sag` 0.12, `gravity` 18, `maxFall` 12, `color` 'rosa'\|'schoko'\|'gelb', `id` → `{ blocks: [{ x, y, z, y0, state }], drop(), falls, info() }` | `{ type: 'donutblock', id: 'donuts', from: [0,0,-270.5], to: [0,0,-277.5] }` |
| `lava` + `color: 'blau'` | blaue Lava (tödlich wie rote, `deathCause 'lava'`); Thema `bluelava` färbt jede Lava blau | Felder von `lava`, `color` 'blau' (Form `lavaColor: 'blau'`) | `{ type: 'lava', pos: [0,-1.5,-274], size: [26,1,8], color: 'blau' }` |
| `flussbruecke` | Hubbrücke über dem Ritt-Fluss: unten Sperre fürs Floß, oben Durchfahrt; zu Fuß bewegte Plattform | `from`/`to` (Enden der Lauffläche unten), `width` 2.6, `thick` 0.45, `lift` 2.8, `wait` 1.6, `speed` 1.8, `phase`, `start` 'low'\|'high', `idle`, `posts`, `rails`, `id` → `{ y, state, hits, box(), start(), stop(), hold('low'\|'high'), toggle(), info() }` | `{ type: 'flussbruecke', id: 'hubbruecke', from: [-5.2,0.35,-48], to: [5.2,0.35,-48], lift: 2.6 }` |
| `multilift` (vorhanden) | 3er-/4er-Lift (Klone zählen) | `need` 3 \| 4, `rise`, `size` … (Präzisierung Motor Welt 2) | `{ type: 'multilift', id: 'dreier', pos: [-8,1,-262], rise: 4, need: 3 }` |
| `figurenschalter` (vorhanden) | Pilzkopf-Figur-Schalter (5-3) | Präzisierung Motor Welt 2 | – |
| `deco_w5` | Kulisse (verschmolzen) | `items: [{ kind, pos, … }]`, `shadow: false`; Strand `palme, palmen, sandburg, sandskulptur, muscheln, sonnenschirm, liegestuhl, strandball, duenen`; Savanne `akazie, akazien, baobab, termitenhuegel, savannengras, felsbrocken`; Torte `tortenstueck, torte, kerzen, sahnehaeubchen, kirsche, zuckerstange, keksstapel`; Tempel `tempelsaeule(n), steinkopf, obelisk, tempeltor, steinplatten`; Mine `grubenbalken(_reihe), grubenlampe, kristalle` | `{ type: 'deco_w5', items: [{ kind: 'akazie', pos: [8.5,1,-124.5], height: 5.5 }, { kind: 'savannengras', pos: [0,1,-122], size: [20,7], n: 12 }] }` |

`landingHint(level, { color })` aus `blocks/w5kit.js` (`show(rects, y, k)`, `hide()`, `info()`) ist der rote
Landeboden-Hinweis für den **Kippquader-König** (Gegner-Agent); `kippquader.nextRects()` liefert die Grundrisse.

### Präzisierung (Motor und Bausteine Welt 5): Modelle

Die Bausteine nutzen Registry-Modelle, sobald `hasModel(name)` gilt (sonst eigene Rückfall-Geometrie, gleiche Kollision):
`trapez` ({ length, width }; state { theta, rider }), `pendelplattform` ({ size, thick, length }; { theta }),
`roehrenkanone` ({ height, radius, color }; { anim 'idle'|'load'|'fire', k }), `drehbruecke` ({ length, width, thick,
style }), `kippquader` ({ size, hole, style }, Ursprung Körpermitte; { anim 'idle'|'warn'|'tip', k }), `donutblock`
(1 m, Ursprung Mitte unten), `suchscheinwerfer` (Lampe, Drehpunkt, Blick +X; { alarm, yaw, pitch }), `flussbruecke`
({ length, width, thick }, Brücke entlang +X), `schluesselmuenze`, `schiebekugel` ({ roll, size }), Kulisse
`deco_w5_<kind>` (Fußpunkt, Blick +X, wird verschmolzen). Der Flipper zeichnet bewusst eigene Instanz-Geometrie.

### Präzisierung (Motor und Bausteine Welt 5): Themen

| Thema | Stimmung | Kulisse (`buildBackdrop`) |
| --- | --- | --- |
| `beach` | strahlender Mittag am Meer, kräftige Sonne; heller Sand, Sandstein; Flüsse in Lagunen-Türkis (`river`-Palette) | türkises Meer mit Schaumbändern, lila Klippeninseln, Segelboote, Möwen |
| `bluelava` | Höhle mit blauem Lavaglühen, Licht an Figur und Laternen; schieferblauer Basalt; **`lavaColor: 'blau'`** | blauer Lavasee tief unten, Tropfsteinsäulen mit blauem Saum, blaue Funken |
| `savanna` | warmer Nachmittag, honiggelber Dunst; goldgelbes Trockengras auf rotbraunem Lehm | goldene Ebene, Akazien-Silhouetten, Tafelberge, ferne Berge, Geier |
| `mine` | Bergwerk: warmes Dunkel, naher Staub-Nebel, Licht an Figur und Grubenlampen | Felswände mit Holz-Stützrahmen, Laternen, funkelnde Erzadern |
| `cake` | Pastell-Torten-Welt, rosa-lila Himmel; Sahne-/Glasur-Decke, Biskuit | Erdbeermilch-Boden, Riesen-Torten, Kirschen, Sahnewolken, Streusel |
| `sneak` | Nacht über einer Lava-Festung (Lichtkegel leuchten additiv); dunkler Burgstein | Lavasee, Burgmauern mit glühenden Fenstern, Mond, Sterne, Funken |
| `temple` | Ruinen-Tempel am späten Nachmittag, goldener Dunst, lange Schatten; Sandstein-Platten | Stufenpyramiden mit Moos und goldenen Spitzen, Dschungel-Kranz, Staub |

`circus` (5-2), `ghost` (5-Kapitän), `lava` (5-B), `train` (5-Zug), `grass` (5-A) bestehen schon. Die Strandwerkstatt
lässt sich mit `?course=0-17&theme=<name>` in jedem Thema ansehen.

### Präzisierung (Motor und Bausteine Welt 5): Welt 5 – Gimmick → Baustein

| Level | Gimmick laut Bauplan | Bausteine |
| --- | --- | --- |
| 5-1 | Strand, 5 Schlüsselmünzen öffnen die Warp-Box, Höhlenfluss mit Pflaume, bewegliche Brücken | `schluesselmuenze` (`onAll: { reveal }`), `warpbox` (`hidden`), Archetyp `parcours_ride` (`ride.section`), `river`, `flussbruecke`, `deco_w5` (Strand), Thema `beach` |
| 5-2 | Zirkus: Trapeze, Seilbahnen, Pendelplattformen | `trapez` (4–5 m Abstand), `pendelplattform`, vorhandene Seilbahn, Thema `circus` |
| 5-3 | unterirdisch, blaue Lava, 3er-/4er-Lifte, Spiegelfrüchte, Figurenschalter | `lava` (blau bzw. Thema `bluelava`), `multilift` (`need` 3/4), `figurenschalter`, `donutblock` |
| 5-4 | Savannenberge, Röhrenkanone ≈ 40 m, Gipfel mit Drehbrücke | `roehrenkanone`, `drehbruecke`, `deco_w5` (Savanne), Thema `savanna` |
| 5-Kapitän | Geisterhaus, Tipp- und Donut-Blöcke | `donutblock` (`color: 'schoko'`), Thema `ghost` |
| 5-5 | Höhle, Zündköpfe, POW-Blöcke | `deco_w5` (Mine: `grubenbalken_reihe`, `grubenlampe`, `kristalle`), Thema `mine` |
| 5-6 | Torten-Welt, Rot-Blau-Flipper bei jedem Sprung, Kugel auf das P-Feld | `flipper` (Raster + Wechselplattformen), `schiebekugel` + `pfeld`, `deco_w5` (Torte), Thema `cake` |
| 5-7 | Schleich-Festung, Suchscheinwerfer, entdeckt → Suchkopf-Welle | `suchscheinwerfer` (Signal `'alarm'`; Deckung = feste Quader zwischen Lampe und Figur), Thema `sneak` |
| 5-Burg | Ruinen-Tempel mit Kippquadern, Boss Kippquader-König | `kippquader` (`hole`, `start: 'near'`), `landingHint`, `deco_w5` (Tempel), Thema `temple` |

### Präzisierung (Motor und Bausteine Welt 5): Tests und Kennzahlen

`tests/course_w5_blocks.mjs` (Port 4390, `PORT_BASE`; `W5B_SHOTS=0` ohne Bilder, `W5B_PART=mech|themes` je Teil, je
unter 10 min): 51 Prüfungen deterministisch über `step(n)`/`setInput` in der Strandwerkstatt `0-17` – Schlüsselmünzen
(HUD 0/5 … 5/5, Warp-Box erscheint erst mit der fünften), Ritt-Abschnitt (Hubbrücke versperrt, Durchfahrt, Absteigen,
Pflaume bleibt, Standard-Kamera zurück), Trapez (greifen, mitschwingen, aufschaukeln, Absprung trifft das Trapez 4,5 m
weiter, Kette bis aufs Plateau), Pendelplattform, Drehbrücke, Röhrenkanone (40 m genau ins Ziel, Zustand `cannon`,
Kamera ≤ 9 m hinter der Figur), Rot-Blau-Flipper (jeder Sprung, durchfallen, Klone, Wechselplattformen),
Schiebekugel (rollen, Druckfeld, Tatzenhieb), Suchscheinwerfer (entdeckt → Signal, Abklingzeit, Verfolgen, Deckung unter
dem Dach), Kippquader (kippt, Hinweis, Treffer, begehbar, trägt, Loch sicher), Donut-Block (fällt nach ≈ 0,5 s, kommt
wieder), blaue Lava tötet, 3er-Lift (2 Figuren nein, 3 ja), Ziel, keine Konsolenfehler; dazu 4 Themen-Prüfungen.
Kennzahlen (960×540, scale 2): Stationen 59–78 Zeichenaufrufe, 122–150 k Dreiecke; Themen-Bilder 59–80 Aufrufe,
115–145 k Dreiecke (Budget < 140 / < 400 k).

## Präzisierung (Gegner Welt 5)

Ergänzung des Gegner-Agenten Welt 5 (Stand: Gegnerwerkstatt Lila Strand `0-18`, Tempel des Kippquader-Königs `0-19`).
Nichts oben Festgelegtes wird geändert; alles ist additiv. Level-Bauer schreiben nur Daten; alle Felder sind optional,
sofern nicht anders vermerkt. Gemeinsame Felder und Konter aus „Präzisierung (Gegner/Power-ups)“ und „(Gegner Welt 2/3/4)“
gelten weiter (`id, pos, dir|yaw, path, loop, wake, edges, drop`; Ziel = nächste Figur, Lava/Absturz = besiegt, `STRONG` =
cannon, bomb, mega, star). Jede Datei dokumentiert ihre Parameter vollständig im Kopfkommentar.

### Präzisierung (Gegner Welt 5): Dateien

```
src/course/entities/kinds/sandtaucher_w5.js        sandtaucher
src/course/entities/kinds/zuendkopf_w5.js          zuendkopf (+ Nachschub-Spender zuendkopf_quelle), lila_ziegel,
                                                   lila_ziegelwand; explodeAt(level, center, radius, source, opts) als Hilfe
src/course/entities/kinds/feuer_w5.js              feuerring, funkenling, glutball
src/course/entities/kinds/hackbeil_w5.js           hackbeil_pilz
src/course/entities/kinds/alarm_w5.js              suchkopf_welle (Suchscheinwerfer-Alarm → Suchkopf-Kanonen feuern eine Welle)
src/course/entities/kinds/werferturm_w5.js         werferturm (Feuer-Werfer auf einem Pilzlingsturm aus bis zu 12 Pilzlingen, 5-B)
src/course/entities/kinds/kippquader_koenig_w5.js  kippquader_koenig (Boss 5-Burg), bruchplatte (Arenaecke, bricht weg)
src/course/entities/kinds/pow.js                   + Entitäten mit `powBreak` (lila Ziegel) bekommen onHit('pound', pow)
src/course/entities/kinds/projektilkopf.js         + Option `breaks` (Kopf zertrümmert beim Aufprall Ziegel/Steinblöcke)
src/course/entities/kinds/kanone_turm.js           + reicht `breaks` an die Köpfe weiter
src/course/levels/w0/0-18.js                       Gegnerwerkstatt Lila Strand (6 Reihen Gehege, Z(r, dz) wie 0-15)
src/course/levels/w0/0-19.js                       Tempel des Kippquader-Königs (Archetyp boss, Bruchplatten-Ecken, Begleit-Kippquader)
tests/course_w5_enemies.mjs                        Port 4400, W5E_PART=1|2|3|4|5, Bilder tests/out/w5e_*.png
```

### Präzisierung (Gegner Welt 5): gemeinsame Regeln

- **Explosionen** (Zündkopf, `explodeAt`): Entitäten im Radius → `onHit('bomb', src)`, Formen mit `breakable`/`mega` →
  `owner.onHit('bomb', src, form)`, **alle** Figuren bis 0,9 × Radius → Treffer, danach `level.onExplosion(c, r, src)`.
  `src.blast = { x, y, z, r }` erlaubt Wänden aus vielen Blöcken, alle Blöcke im Radius zu zerbrechen.
- **Lila Ziegel** tragen `breakable: 'bomb'` (Stampfen der Figur bricht sie nicht, Tatzenhieb/Riese/Explosion erreichen
  sie) und `powBreak` (POW-Block). Zerbrechen: Explosion, Tatzenhieb/Schwanzhieb, Riesentrank, Kanonenkugel, POW;
  Kopfstoß und Stampfattacke lassen sie nur wackeln.
- **Tragen/Werfen** des Zündkopfs über das vorhandene Trage-System (`carryable`, `onPickup/onThrow/onDrop`, Rennen +
  Berühren hebt auf). Geworfen explodiert er am ersten Hindernis (Wand, Gegner, Endgegner: `onBombHit(src)` vorher).
- **Signale:** die Suchkopf-Welle hört auf `level.onSignal('alarm')` (bzw. `signal`), mit `lights` direkt auf
  `level.named.get(id).onDetect` der Suchscheinwerfer. Kanonen bleiben dafür mit `active: false` still.
- **Bosse:** der Kippquader-König ist kein `enemy`, `boss: true`, Schnittstelle wie Lavafelsen-König (`begin, reset, state,
  stateT, hp, maxHp, phase, visible, home, half, carHits 0, vulnerable, info()`, `level.onBossHit(boss, 'ruecken')`,
  `level.onBossDefeated`), eigene Phasen-Ansagen (`arch.seenPhase`). Rote Landefläche = `landingHint` aus `blocks/w5kit.js`.
- **Sound** nur über vorhandene `level.sfx`-Namen (`sand_crumble`, `splash_big`, `hover`, `slam`, `brickbreak`, `swoop`,
  `panic`, `bullet`, `boss_hit`, `boss_spin`, `stomp`, `blockhit`, `bounce`, `land`, `powerdown`).

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| sandtaucher | schwimmt verborgen (Flosse, Sandwelle/Wellenring), folgt der Figur im Revier, späht (0,45 s), springt im Bogen (1,1 s) durch ihre Stelle und landet dahinter | **im Sprung**: Draufspringen/Stampfen (platt, Abprall), alle Angriffe; verborgen nur Stampfwelle daneben/Explosion | seitlich im Sprung |
| zuendkopf | läuft/verfolgt; Nähe/Berührung/Treffer zündet, rennt brennend, blinkt, explodiert nach 3 s (2 m) | Stern/Riese entschärfen (zählt); Explosion zählt nicht | nur die Explosion |
| feuerring | Puls: Ring wächst im Takt bis radius, erlischt, Pause; Rad: Flammen auf Kreis drehen sich, Lücken, optional atmend/blinkend | nie | Flammen (Füße darunter), Brennerkern |
| hackbeil_pilz | hüpft heran, holt aus (0,55 s Vorwarnung), hackt (Schneide 1,1–1,4 m vor ihm), steckt 1,3 s fest | festgesteckt von oben; sonst von hinten draufspringen; alle Angriffe | Schneide im Hieb, Beil auf dem Kopf (von vorn), seitlich (nicht festgesteckt) |
| funkenling | Bahn (auch senkrecht an Wänden), Blockrand, Kreis oder wuselnd mit Hüpfern | nur Power-ups: Tatzenhieb/Sturzflug/Schwanzhieb, Kanonenkugel, Explosion, Riese, Stern | jede Berührung (auch von oben) |
| glutball | springt im Takt aus (blauer) Lava, Reihen versetzt | Stern, Riese, Explosion | in der Luft |
| suchkopf_welle | Alarm → Kanonen feuern shots Köpfe, Abklingzeit | – (Leitstand) | – |
| werferturm | hoher Pilzlingsturm, Werfer obenauf wirft; Stufen weg → Werfer sinkt; Turm fällt → Werfer am Boden | Stufen wie Pilzlingsturm; Explosion/Riese/Stern/POW ganz | seitlich; Geschosse |
| kippquader_koenig | geht, rote Landefläche, kippt aufs Gesicht, liegt begehbar | nur Landung auf dem Rückenfeld (3×) | stehend seitlich, Aufschlag, Schockwelle (Phase 3) |

### Präzisierung (Gegner Welt 5): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Sandtaucher: pos.y = Sand-/Wasseroberfläche; ground 'sand'|'wasser' (Standard: Wasser, wenn an pos eine Wasserform ist),
  //   path (Bahn verborgen), loop, speed 2, chaseSpeed 3, sight 8, trigger 3.4 (Sprung), leap 4.5 (größte Sprungweite),
  //   height 1.5 (Sprunghöhe), lead 0.35 (s Vorhalt), through 0.68 (an diesem Anteil des Sprungs kreuzt er die Figur),
  //   cooldown 1.4, peek 0.45, range 6 (Revier-Kreis um pos) | area { min: [x, z], max: [x, z] } (Revier-Rechteck), phase
  { kind: 'sandtaucher', pos: [-11.5, 1, -15], area: { min: [-18, -21], max: [-5, -9] } },
  { kind: 'sandtaucher', pos: [15, 2.2, -15], ground: 'wasser', range: 5 },       // Wasser: folgt dem Wasserspiegel
  // Zündkopf: speed 1.2, behavior 'chase'|'walk', sight 7, trigger 2.2 (Nähe zündet; 0 = nie), fuse 3, radius 2, lit,
  //   litSpeed 2.4, vel (Start im Flug), owner; spawner { every 4, max 2, first 0.5, range 30 } = Nachschub an pos
  { kind: 'zuendkopf', pos: [-15, 1, -32], sight: 7 },
  { kind: 'zuendkopf', pos: [-17.5, 1, -30], spawner: { every: 5, max: 1 }, behavior: 'walk', dir: [1, 0] },
  // Feuerring: mode 'puls'|'rad', radius 4 (puls) | 3 (rad), height 0.7, color 'rot'|'blau'|'pink', flames;
  //   puls: period 2.4, wait 0.6, phase; rad: speed 1.2 (rad/s), gaps 1, gap 70 (°), angle, pulse { min, period },
  //   blink [an, aus] (s), phase
  { kind: 'feuerring', pos: [-11.5, 1, -55], mode: 'puls', radius: 4.5 },
  { kind: 'feuerring', pos: [11.5, 1, -55], mode: 'rad', radius: 3, gaps: 1, gap: 80, speed: 1 },
  { kind: 'feuerring', pos: [16.5, 1, -60], mode: 'rad', radius: 1.4, gaps: 0, blink: [2, 1.2], color: 'pink' },
  // Hackbeil-Pilz: hop 0.8 (m je Hüpfer), sight 6, reach 1.9, raise 0.55, stuck 1.3, cooldown 0.9, behavior 'chase'|'patrol'
  { kind: 'hackbeil_pilz', pos: [-15, 1, -73], dir: [1, 0] },
  { kind: 'hackbeil_pilz', pos: [-14, 1, -79], behavior: 'patrol', path: [[-17, 1, -79], [-8, 1, -79]], sight: 0 },
  // Funkenling: path|rail (y = Laufebene, auch senkrecht), loop, block { pos, size }, center + radius, cw, speed 2, phase,
  //   count, spacing 1.5, wait; ohne Bahn mode 'wusel' (pos, dir, behavior 'walk'|'chase', sight 6); color 'rot'|'blau'|'pink'
  { kind: 'funkenling', block: { pos: [8, 1, -73], size: [3, 1.2, 3] } },
  { kind: 'funkenling', path: [[13.5, 1, -76.2], [13.5, 4, -76.2], [17.5, 4, -76.2], [17.5, 1, -76.2]], loop: true, color: 'blau' },
  { kind: 'funkenling', pos: [14, 1, -71], dir: [1, 0], color: 'pink' },
  // Glutball: pos = Lava-Oberfläche, height 3.5, period 2.6, phase, count, spacing 1.6, dir [1, 0], stagger 0.12,
  //   color 'blau'|'rot' (Standard: Farbe der Lava darunter)
  { kind: 'glutball', pos: [-14.5, 1.3, -95], count: 3, spacing: 3, height: 3.2, period: 2.4, stagger: 0.2 },
  // Suchkopf-Welle: signal 'alarm' | Liste, lights ['licht', …] (statt signal), cannons ['k1', …] (kanone_turm, active:
  //   false), shots 3, every 1.2 (≥ 1,1), stagger 0.35, cooldown 4, range 40, from [{ pos, dir, shot }] (Köpfe ohne Kanone),
  //   shot 'suchkopf', speed/seek/turn/life/breaks (from-Köpfe), onWave (Aktion)
  { kind: 'kanone_turm', id: 'k1', pos: [5.5, 1, -101], dir: [1, 0], shot: 'suchkopf', active: false, breaks: true },
  { kind: 'suchkopf_welle', cannons: ['k1', 'k2'], shots: 2, cooldown: 3 },
  // Werferturm (5-B): count 9 (1–12), speed 0.8, behavior 'chase'|'walk', sight 10, weapon 'feuer'|'hammer'|'bumerang',
  //   rider true, interval/volley/first (Werfer), throwSight 14, riderId (level.named des Werfers), riderDrop
  { kind: 'werferturm', pos: [0, 1, -10], count: 9, riderId: 'werfer' },
  // Vorhandene im Welt-5-Einsatz (Felder wie in den Präzisierungen Welt 1–4): panzerkroete, pilzling (mini), rammbock_bulle,
  //   ameisensoldat, feuer_werfer, pilzlingsturm, kreisgeist(_kreis), muenzmarder, spuk, krabbelkaefer, flatterkaefer,
  //   schnappblume, riesenschnappblume, feuer_schnappblume, wuschel, suchkopf/kanone_turm – alle bereit (0-18 Reihe 6)
],
items: [
  // lila Ziegel: einzeln (1 m) oder Wand aus ganzen Blöcken; content (Beute je Block), onBreak (Aktion beim letzten Block)
  { kind: 'lila_ziegel', pos: [17.5, 1, -34] },
  { kind: 'lila_ziegelwand', pos: [12, 1, -37.5], size: [3, 2, 1], content: 'coin', onBreak: { reveal: 'warp1' } },
],
```

Projektil-/Suchköpfe (auch über `kanone_turm`): `breaks: true | r` – beim Aufprall an Wand/Boden zertrümmert der Kopf
Zerbrechliches im Umkreis r (Standard 0,9 m): Ziegel, graue Steinblöcke, lila Ziegel, Holzwände (5-7 Stern 2).

### Präzisierung (Gegner Welt 5): Kippquader-König

```js
{ kind: 'kippquader_koenig', id: 'koenig', pos: [0, 2, -5] (Start, Fußpunkt), dir: [0, 1] (Start-Blick),
  arena: { min: [-10, -10], max: [10, 10] } | { center: [x, y, z], r: 9 }, hp: 3,
  speed: [1.4, 1.9, 2.4], walk: [2.6, 1.9, 1.3], warn: [0.95, 0.8, 0.65], tilt: [0.7, 0.6, 0.5], lie: [2.8, 2.4, 2.1],
  shock: [false, false, true], shockR: 7, shockSpeed: 6.5, escorts: ['kq_l', 'kq_r'], escortFrom: 3,
  corners: [['ecke_vl', 'ecke_vr'], ['ecke_hl', 'ecke_hr']], star: { pos: [0, 2.4, 6.5], index: 0 }, wakeR: 10, drop }
boss: { id: 'koenig', name: 'Kippquader-König', speed: 0, trigger, lock, warp: 'warp_sieg', warpPos, warpTo, frame: 0.45, center }
items: [{ kind: 'bruchplatte', id: 'ecke_vl', pos: [-8, 2, 8] (Mitte der Oberseite), size: [4, 4], thick: 1, warn: 0.9,
          style: 'tempel' | 'stein' }, …]
segments: [{ type: 'kippquader', id: 'kq_l', pos, size: [2, 4, 2], steps: ['+z', '-z'], start: 'signal', … }]   // Begleiter
```

Ablauf: `wait` → `intro` (2,2 s) → Runde: `walk` (er blickt immer in eine Himmelsrichtung und richtet sich so aus, dass die
Figur 2,6 m vor ihm in seiner Kipp-Bahn steht) → `warn` (rote Landefläche = genau sein liegender Grundriss 3,6 × 3,4 m,
zittert) → `tilt` (kippt aufs Gesicht; Aufschlag trifft Figuren im Grundriss und schiebt sie hinaus, Gegner darunter
`onHit('mega')`) → `lie` (feste Kollisions-Box, Oberseite 1,5 m = Rücken, begehbar; **nur eine Landung – Sprung oder
Stampfattacke – auf dem Schwachpunkt-Feld** 1,9 × 1,9 m um 2,6 m vor dem Fuß (= `model.back()`) ist ein Treffer: Abprall,
`hit` 0,6 s) → `rise` (0,8 s; wer auf ihm steht, wird abgeworfen) → nach einem Treffer brechen `corners[i]` weg, `roar`
(1 s) → `walk` … Er kippt auch, wenn walk abläuft (kippt öfter, je Phase kürzer), nur wenn der Grundriss ganz in der Arena
liegt (Bruchplatten und Begleit-Kippquader meidet er). Phase 3: **Schockwelle** (Ring 0,45 m hoch, drüberspringen) und
die Begleit-Kippquader beginnen ihre Bahn (mit eigener roter Vorwarnung). Treffer von vorn/seitlich, Landen neben dem Feld,
Feuer, Krallen, Kanone, Bombe, Stern, Riese zählen nicht; stehend: Berührung verletzt, Kopfsprung = Abprall. 3 Treffer →
`defeated` (2,2 s, zerbröckelt, Krone springt) → `gone` (Stern, Archetyp: Fanfare `course_clear`, Warp-Box). Ansagen:
„Spring auf den blauen Stern auf seinem Rücken!“, „Er wird schneller!“, „Der Boden bebt – spring über die Welle!“. Tod im
Kampf: König 3/3 am Start, Ecken wieder fest, Begleiter zurück (ruhen), Kampf von vorn. Laufzeit: `facing, lying, tips,
hits, misses, shocks, escortTips, hitLog, lyingBox(), backField(), lieRect(), info()`.

### Präzisierung (Gegner Welt 5): Hinweise für Level-Bauer

- Sandtaucher: Revier (`area`/`range`) = Sandfläche bzw. Wasserbereich; er landet nur darin. Im Ritt-Fluss (5-1) springt er
  den reitenden Spieler an (RideController ist eine Figur); `area` dann auf den Kanal legen, `pos.y` = Wasseroberfläche.
- Zündkopf-Nachschub (5-5 „3 + Nachschub“): `spawner` an einer Röhre, `vel: [0, 6, 1.5]` lässt ihn herausspringen.
- Lila Ziegelwand vor einer Glasröhre (5-5): `lila_ziegelwand` mit `onBreak`; POW-Blöcke (`pow`, radius) wirken mit.
- Feuerringe (5-6): Puls-Ringe mit verschiedenem `phase` versetzen; Rad mit 1–2 Lücken (≥ 70°) bei 0,8–1,2 rad/s.
- Schleich-Festung (5-7): Suchscheinwerfer + `kanone_turm` (`active: false`, `shot: 'suchkopf'`, ggf. `breaks: true`) +
  `suchkopf_welle`; Deckung (Dach) gegen das Licht.
- 5-B: `werferturm` mit `count: 9`; der Werfer ist über steigende Plattformen erreichbar, Stufen fallen durch Treffer.
- 5-Burg: Arena ≥ 20 × 20 m, Ecken als `bruchplatte` (der König betritt sie nie), Begleit-Kippquader auf den Armen mit
  `start: 'signal'`; zwischen Steg und Arena `boss.lock`.

### Präzisierung (Gegner Welt 5): Tests und Kennzahlen

`tests/course_w5_enemies.mjs` (Port 4400, `?course=0-18|0-19&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`;
Hilfen `window.__t`: `Z(r, dz)`, `place`, `stomp`, `touch`, `fresh`, `hold`, `moveTo`, `action`, `face`, Boss: `enter`,
`untilSafe`, `backJump`; `W5E_PART=1|2|3|4|5`, je Teil 1,5–3 min): Laden (alle Arten, vorhandene Welt-5-Gegner, 10 s ohne
Fehler) · Teil 1 Sandtaucher (verborgen harmlos, folgt, späht, Bogen durch die Figur, seitlich verletzt, Stampfen im
Sprung besiegt, Wasser), Zündkopf (Nähe zündet, 3 s, blinkt, Explosion verletzt/besiegt/zerstört lila Ziegel, Stampfen
zündet, Kette, Stern entschärft, Nachschub ≤ max), Tragen/Werfen (Aufprall explodiert), lila Ziegel (Inhalt, Stampfen nein,
Tatzenhieb/POW ja), Explosion zerstört Ziegel/Steinblock · Teil 2 Feuerring (Puls, stehen = Treffer, drüberspringen heil,
Kern, nicht besiegbar, Rad dreht, Lücke, blink), Hackbeil-Pilz (Anlauf, Vorwarnung, Hieb, Schneide, festgesteckt von oben,
von vorn Treffer, von hinten besiegt), Funkenling (Blockrand, Wand, wuseln, nur Power-ups), Glutball (Takt, Versatz,
Farbe, Luft/Lava), Suchkopf-Welle (still ohne Alarm, Welle 2 + 2, Abklingzeit), breaks, Werferturm · Teil 3
Kippquader-König vollständig (Auftritt, Landefläche = Grundriss, Kippen trifft, begehbar, daneben zählt nicht, Rückenfeld
= model.back, 3 Treffer inkl. Stampfattacke, Ecken, Phasen-Ansagen, Schockwelle, Begleiter, Sieg → Stern + Warp → Ziel,
Tod setzt zurück, Klon) · Teil 4 Bilder `tests/out/w5e_*.png` und Zeichenaufrufe · Teil 5 Sandtaucher im Ritt-Fluss
der Strandwerkstatt `0-17` (springt den auf Pflaume reitenden Spieler an, Treffer). Gemessen (scale 2, inkl. Schattenpass,
Thema beach/temple): Gegnerwerkstatt 54–90 Zeichenaufrufe (≤ 182 k Dreiecke), Tempel-Arena 37–50 (≤ 104 k).

## Präzisierung (Level 5-1 und 5-2)

Additiv zur Welt-5-Liste: Titel und Besonderheiten der beiden ersten Level der Lila Strand-Insel. Dateien
`src/course/levels/w5/5-1.js`, `5-2.js`, eigene Hilfen `src/course/levels/w5/_helpers_a.js` (kein `LEVEL`, nur für diese
beiden Level), Test `tests/course_w5a.mjs`. Kein Motor-Code geändert; Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.build`).

### 5-1 „Schlüsselsuche am Muschelstrand“ (parcours_ride · beach · course_beach · 500 s)

- Abschnitte (nach −Z): **Sandstrand** (x −34 … 40, offener Strand mit Flachwasser, Sandbank, Rettungsturm, Sandburgen,
  Palmenhain, lila Fels mit Wandhöhle) → **Schwebeinsel** (y 9, Checkpoint, Röhre) → **Glitzergrotte** (Steg, Ritt auf
  Pflaume ≈ 120 m Höhlenfluss mit zwei Hubbrücken, Sandtauchern im Wasser, Holzschanze; Grottenstrand mit Karottenkorb) →
  **Zielinsel** (Leuchtturm, Zielmast).
- Fünf Schlüsselmünzen (`schluesselmuenze`, Gruppe → `reveal` der versteckten Warp-Box auf der Sandbank): Sandburg,
  Palmenhain, Fels im Flachwasser, Rettungsturm, Fels hinter den Rammbock-Bullen. Die Warp-Box bringt zur Schwebeinsel.
- Sterne: 0 rechte Pilzlings-Sandskulptur zerstampfen (Sprung allein reicht nicht; links Münzen, Mitte sechs
  Mini-Pilzlinge) · 1 Meeresloch neben der Sandbank → Röhre → Farbfeld-Raum, alle 16 Felder betreten · 2 Wandhöhle im lila
  Fels: Krabbelkäfer besiegen (Aufgabe `task`), dann gibt Krümel den Stern. Stempel: über der Holzschanze im Flussritt
  (Sprung halten; ohne Sprung zu niedrig).
- Extraleben: unsichtbarer Block vor dem roten Strandkorb, Schatztruhe hinter dem Leuchtturm, dritter Münzmarder.
- Haken-Hilfen: `sandSkulpturen`, `kruemelHoehle`, `rettungsturm`, `leuchtturm`, `hoehlenTor` (blendet aus, solange die
  Figur in der Höhle ist), `raumKlar` (Raum-Ausschnitt verschwindet ganz statt 18 % Schleier), `fernAus` (Grottenteile vom
  Strand aus ausgeblendet – Budget), Schwimmtiere, Krabben, Delfine, Brandung, Kristalle, Leuchtpilze, Lichtschächte,
  `schattenDiaet` (Gegner werfen nur mit dem größten Teil Sonnenschatten).

### 5-2 „Zirkus Schwingeschwung“ (parcours · circus · course_trapeze · 400 s)

- Abschnitte (Bühnen schweben über den Manegen, y 1 → 9 → 5 → 10 → 14): **Startbühne und Seilbahn 1** → Trapezbühne, drei
  Trapeze (4,5 m Abstand) → **Seilbahn 2** hinab zur Checkpoint-Bühne, Pilz-Trampolin hinauf → **Riesen-Gasse**
  (?-Block mit Riesentrank: als Riese durch drei graue Steinwände, Pilzlinge und zwei Riesenschnappblumen; ohne Trank über
  den Seitensteg) → Glasröhre zur Bühne F (Checkpoint 2) → **Pendelplattform**, Bühne G (Funkenlinge um die Trommeln),
  **drei Drehscheiben** mit Stachelstangen (bunte, mitdrehende Hülle `zirkusScheiben`) → Bühne H, drei Trapeze, Bühne I,
  letztes Trapez → **Zielbühne** mit Sternring und Konfetti-Regen.
- Sterne: 0 aus der fahrenden Gondel 1 auf den hohen Sims links springen · 1 von Drehscheibe 2 zur Ostbühne, Röhre in den
  Blaumünzen-Raum (Druckschalter, acht blaue Münzen in 10 s) · 2 Sternring vor dem Ziel (acht Sternmünzen in 10 s).
  Stempel: Pilz-Trampolin auf Bühne H → Stempel-Sims (vom Bühnenboden aus nicht erreichbar).
- Extraleben: unsichtbarer Block über dem hohen Sims, hinter der dritten Steinwand (nur als Riese).
- Trapeze für Bodenabsprünge 1,5 m vor der Bühnenkante aufhängen (Greifradius 0,8 m), Aufhängung Bühne + 6,2 m, Länge 3.

### Test `tests/course_w5a.mjs`

Port 4470 (+ `PORT_BASE`), Aufruf `node tests/course_w5a.mjs [5-1|5-2]`, Teilläufe `PARTS=load,route,sweep,targets,extra,shots`
(je Lauf < 10 min), `HEROES=lotti,greta`, `ONLY=<Text>`, `SHOTS='a|b'`, `DETAIL=1` (Zeichenaufrufe je Objekt), Bilder
`tests/out/w5a_*.png`. Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start →
Ziel mit echter Mechanik (5-1: fünf Schlüssel, Warp-Box, Ritt; 5-2: zwei Gondeln, sieben Trapeze, Pendel, Trampolin);
alle Sterne, Stempel und Extraleben samt Gegenproben (Stern/Stempel nicht ohne die Mechanik), Hubbrücke unten hält das
Floß auf (Bein `{ bridge: [id, 'low' | 'high' | 'start'] }`); Messgang entlang der Route. Gemessen (scale 2, inkl.
Schattenpass): 5-1 bis ≈ 112 Zeichenaufrufe / ≈ 285 k Dreiecke (offener Strand – dort ist kaum noch Luft), 5-2 bis ≈ 92 /
≈ 260 k (Riesen-Gasse).

## Präzisierung (Level 5-3, 5-A, 5-4 und 5-Kapitän)

Additiv zur Welt-5-Liste: Titel und Besonderheiten der Level 5-3, 5-A, 5-4 und 5-Kapitän. Dateien
`src/course/levels/w5/5-3.js`, `5-A.js`, `5-4.js`, `5-Kapitän.js`, eigene Hilfen `src/course/levels/w5/_helpers_b.js`
(kein `LEVEL`, nur für diese vier Level), Test `tests/course_w5b.mjs`. Kein Motor-Code geändert; alle Sonderteile sind
level-lokal (Hilfsdatei, Haken `LEVEL.build`/`LEVEL.setup`).

### 5-3 „Klon-Gewusel in den Blauglut-Gassen“ (parcours · bluelava · course_bluelava · 100 s)

- Unterirdische Höhlenstadt (≈ 40 × 20 m, Boden y 1) über einem **eigenen** blauen Lavasee (`blueLavaSea`: Tötungs-Quader
  `kill: 'lava'` + zwei laufende Voronoi-Ebenen; der Motor-Baustein `lava` zeigt bei 0,12 m Abstand Körper-Oberkante ↔
  Wellenebene dunkle Flecken). Start Südgasse neben der **rissigen Fliese**, Ziel gegenüber in der Nordgasse (Höhlenausgang
  mit Tageslicht). West- und Ostgasse mit Lavaspalten und Glutbällen; Abkürzung über die **Marktinsel** (Uhrturm, Brunnen,
  Marktstände) über zwei Brücken, je von einer Feuer-Schnappblume bewacht. Checkpoint vor dem 4er-Lift.
- Sterne: 0 Stampfattacke auf die rissige Fliese (`crackTile`: `breakable`-Form, `owner.onHit('pound')`), Stern in der
  Grube darunter (Darüberlaufen/-springen bricht sie nicht) · 1 zwei Spiegelfrucht-Kristalle (`fruitCrystal`), drei
  Figuren auf dem 3er-Lift in der Nische der Marktinsel → Uhrturm-Terrasse · 2 vier Figuren auf dem 4er-Lift →
  Felsterrasse (Liftschacht mit `camIgnore`-Wänden hält die Klone auf dem Lift) **oder** Krallen-Anzug aus dem ?-Block und
  die Kletterwand daneben. Stempel: **Figurenschalter** (`hero: 'greta'`, „Pilzkopf-Figur“ = Greta) in der Ostgasse →
  Kristallstufen (`appear`) aufs Dach eines Oberstadt-Hauses; Lotti drückt ihn nicht.
- Extraleben: unsichtbarer Block über dem Blauglut-Brunnen. Budget: Zielmast, Checkpoint, Lifte, Schilder, Pilzlinge und
  Feuer-Schnappblumen ohne Sonnenschatten (`quietShadows`, Blob-Schatten bleiben) – mit drei Klonen im Bild ≤ 115 Aufrufe.

### 5-A „Hörnerherde am Lila Strand“ (arena · grass · course_arena · 200 s, 1 Stern)

- Gelber Gitterkäfig (`arena_cage`, Innenradius 11 m ≈ 22 × 22 m) auf einer runden Insel mit lila Sand im türkisen Meer,
  Tribünen links/rechts/hinten, Wimpel mit Wimpelketten, Fackeln, Palmen, Sandburg, Strandtücher, Krebse,
  Rettungsschwimmer-Turm, Segelboote, Möwen.
- Fünf Rammbock-Bullen in **zwei Wellen** (`bullWaves`): zwei im Käfig; drei warten draußen auf Sandsteinfelsen (Arenahöhe,
  die Kamera sieht sie über den Plattformrand) und springen nach dem Sieg über die ersten zwei nacheinander in hohem Bogen
  über das Gitter (Ansage, Staub, Ring, Jubel). Geparkte Bullen sind nicht berührbar und laufen nicht; der Arena-Archetyp
  zählt alle fünf („noch 5“). Tod: Arena-Neustart (frische Bullen) und die Wellen parken wieder (`onRespawn` nach dem
  Archetyp-`respawn`). ?-Block mit Funkenblüte (trifft von weitem), Münzblock, unsichtbarer Extraleben-Block über dem
  Sternmosaik.

### 5-4 „Kanonenflug über die Goldsavanne“ (parcours · savanna · course_savanna · 400 s)

- Gebänderte Tafelberge ragen aus der goldenen Ebene (Thema-Boden y −22); Flanken `cliffSkirt` (Umriss-Prisma mit Bändern,
  nach unten breiter, nur Darstellung), Böden `savannaFloor` (Grasflecken, Blumen, Büsche), Trampelpfade, Giraffen,
  Heißluftballons. Abschnitte (≈ 280 m): **Startsäule** (y 10) mit Röhrenkanone ≈ 43 m zum **Kletterberg** (Terrassen
  7 → 10,5 → 14,5 → 19: Ameisenkreise, Rampe, Glasröhren, Wuschel, Ameisen-Wandspur – auf die kletternde Ameise
  springen, sie trägt die Figur hinauf –, Gipfel mit **Drehbrücke** und
  zweiter Kanone) → **dritter Berg** (60 × 74 m, y 9: Checkpoint, Wasserlöcher, Hasen, Ameisenstrom in das Loch eines
  Ameisenhügels) → **Hohe Wand** (30 m: ?-Block mit Funkelstern am Eingang, Glasröhre zum Sims mit drei Wuscheln, zweite
  Glasröhre ganz hinauf) → **Plateau** (y 39) mit zwei Drehbalken (`drehplattform`), Insel mit Sternring, Zielmast.
- Sterne: 0 Mulde bei der ersten Glasröhren-Gruppe (Abzweig der linken Röhre nach links; ein Wuschel kreist um den Stern;
  auch von der Terrasse hinabspringen) · 1 grün leuchtender Hase (`bunny` mit `star: 1`, Schein und Funken `bunnyGlow`) ·
  2 Sternring (acht Sternmünzen auf der Insel und dem Zielplateau, 16 s). Stempel: **Ameisenloch** = eingelassene Warp-Box
  (Modell ausgeblendet, `antHill` zeichnet Krater und Loch, Ameisen laufen mit `mode: 'once'` hinein) → Ameisenbau
  (Unterbereich x 392 … 416, eigene Kameraschiene `area`, warme Höhlen-Stimmung `areaMood`, beim Warp sofort) → der
  Stempel reitet auf dem Lastdeck der Riesenameise (`stampOnAnt`), Warp-Box zurück ins Loch.
- Extraleben: unsichtbarer Block am Gipfel neben der Drehbrücke, zwei kleine Hasen. Münzbögen in den Kanonen-Flugbahnen
  (`cannonCoins` rechnet die Bahn von `flightCtl` nach).

### 5-Kapitän „Krümel im Kicherschlösschen“ (diorama · ghost · course_diorama · 400 s, 5 Sterne)

- Spuk-Diorama (≈ 28 × 28 m) auf einem Felssockel über violettem Nebel, Mondlicht (Stimmung `aussen`). Ebenen: Hof y −3,
  Garten y 0 (Start, Mondschein-Rasen), Terrasse y 3, Balkonreihe y 7 (mit Lücken), Dach y 11; Schlösschen mit Zinnen,
  Spitzdach-Türmen, Uhrtürmchen und Fenstern ringsum (`castleBlock`), Grabsteine mit Herzchen, Kürbislaternen, kahle
  Bäume, Eisenzäune, Leuchtpilze, Fledermäuse, Irrlichter. Krümel springt nicht; sechs `spuk_tuer` verbinden die Ebenen.
- Sterne (Bauplan): 1 Tür im Gruft-Häuschen am Start → rechter Balkon, **Kristallplattform** (`antipp`, `appear`)
  antippen → Erker · 2 Hang hinab in den Hof, **linke** Tür → linker Balkon (die rechte führt aufs Dach zum Großspuk) ·
  3 vom linken Balkon zwei **Tippblöcke** antippen (`antipp`, `slide` aus der Wand) → mittlerer Erker · 4 Weg durch den
  **Kreisgeist-Ring** (7, Radius 3 m, 1 m/s – Lücke abwarten) zum Brunnen-Sockel · 5 Rampe hinter dem Ring zur Terrasse,
  von der Kante auf die **Donut-Blöcke** (`schoko`) fallen, darüber zur Säule. Gegner: Spuk (1, Hof), Kreisgeist (7),
  Großspuk (1, Dach). Schatzstellen: Garten, Hof, Dach.

### Test `tests/course_w5b.mjs`

Port 4480 (+ `PORT_BASE`), Aufruf `node tests/course_w5b.mjs [5-3|5-A|5-4|5-Kapitän]`, Teilläufe
`PARTS=load,route,targets,extra,sweep,shots` (je Lauf < 10 min), `HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`,
`DETAIL=1` (Zeichenaufrufe je Objekt), Bilder `tests/out/w5b_*.png`. Bot mit echter Eingabe (`setInput`/`step`, Stick
relativ zur Kamera-Gier); Beine u. a. `poundAt`, `gather`/`liftTop` (Klone, Lifte), `climbOnto`, `ride` (Kanone, Röhre,
Warp-Box, Tür), `rideInput` (Stick in der Röhre: Abzweig), `bar` (Drehbalken: Arm abwarten, zur Nabe, Arm zum Ziel,
Absprung), `antRide` (auf die kletternde Ameise), `until: 'brueckeZneu'`, `tap` (Bildschirm-Tipp auf die Zielmitte,
Strahl wie im Spiel), `ring` (Kreisgeist-Lücke vorausrechnen), Arena-Bot `fight` (Kopfsprünge, Ausweichen, Stern).
Geprüft: Laden ohne Konsolenfehler, Metadaten,
Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel; alle Sterne und Stempel mit Gegenproben (Fliese nicht ohne
Stampfen, 3er-Lift nicht mit zwei Figuren, Lotti drückt den Greta-Schalter nicht, Kristall-Lücke nicht ohne Antippen),
Extraleben, alles in einem Lauf (5-3 43,5 s; 5-4 68,9 s; 5-Kapitän 39,2 s), Arena: Wellen-Regeln, Tod setzt zurück,
Funkenblüte; Messgang. Gemessen (scale 2, inkl. Schattenpass): 5-3 32–115 Zeichenaufrufe (115 mit drei Klonen auf dem
Uhrturm) / ≤ 256 k Dreiecke · 5-A 59–93 / ≤ 242 k · 5-4 35–71 / ≤ 265 k · 5-Kapitän 47–83 / ≤ 241 k.
Bekannt: Donut-Blöcke fallen nicht, solange die Figur genau auf der Fuge zwischen zwei Blöcken steht (Motor, 5-Kapitän:
Gehen genügt); Stimmungswechsel blenden im Kopflos-Browser langsam über (Bildrate), im Spiel ≈ 1 s.

## Halloween-Welt „Kürbisinsel“ – Level-Liste und Freischaltung (Hauptsitzung)

Sonderwelt auf Wunsch des Auftraggebers („helloweenwelt“), **nicht** im Bauplan – eigene Ideen, kindgerecht-gruselig
(niedlich, nie erschreckend): Abendrot und Mondnacht, Kürbisse mit Gesichtern, Laternen, Spinnweben, Fledermäuse,
Grabsteine mit Lachgesichtern, Hexenkessel, Süßigkeiten. Münzen bleiben Bitcoins.

**Erreichbarkeit:** sofort für alle – auf der **Welt-1-Karte** steht nahe der Ankunft eine mit Kürbissen und Laternen
geschmückte Glasröhre `HW` (immer frei, kein Sternbedarf). Ankunft in der Halloween-Welt an der Rückweg-Röhre `W1`.
Interne Weltnummer **31** (31. Oktober), Level-Ids mit Präfix **`H-`** (`H-1` …); die Karte bildet das Präfix über
`MAP.prefix: 'H'` auf Welt 31 ab (`worldOfLevel`, Sternzählung `starsInWorld`, Speicherstand – additiv, Welt-Zahlen
1–8 bleiben unberührt). Anzeige auf Podest/HUD: „H-1“, Weltname „Halloween · Kürbisinsel“.

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `H-1` | parcours (Kürbisfeld im Abendrot: Kürbis-Hüpfer, rollende Kürbisse, Vogelscheuchen, Laternenpfad) | pumpkin | course_pumpkin | 3 + Stempel | Welt offen |
| `H-2` | parcours offen (Süßes-oder-Saures-Dorf bei Nacht: Türen klingeln → Bitcoins/Süßes oder ein Kürbling springt heraus) | candyvillage | course_candyvillage | 3 + Stempel | H-1 |
| `H-Kapitän` | diorama (Krümel mit Laterne im Kürbislabyrinth) | pumpkin (Nacht-Stimmung) | course_diorama | 3 | H-2 |
| `H-3` | parcours (Nebelfriedhof: Laternenlicht macht Geisterplattformen sichtbar, Klapperknochen, Kreisgeister, Floß auf dem Glibberbach) | graveyard | course_graveyard | 3 + Stempel | H-2 |
| `H-4` | parcours vertikal (Hexenturm: fliegende Besen-Plattformen, Hexenkessel-Trampoline, Zaubertrank-Blasen) | witchtower | course_witchtower | 3 + Stempel | H-3 |
| `H-Burg` | parcours + boss (Gruselschloss, Boss **Graf Brummbär** – Baron Brummbär im Vampirumhang) | castle_night | course_brummula | 3 + Stempel | H-4 |

18 Sterne, 5 Stempel. Kartenmusik `course_halloween_map`.

**Neu (Halloween):**
- Gegner: **Kürbling** (hüpfender Kürbis mit Gesicht und Blatt-Mütze; Draufspringen → zerplatzt in Kerne/Münzen),
  **Klapperknochen** (niedliches Skelett, zerfällt beim Draufspringen zu einem Knochenhaufen und setzt sich nach 4 s
  wieder zusammen; nur Stampfattacke/Power-up besiegt endgültig), **Flatterfledi** (Fledermaus, sturzflug im Bogen),
  **Hexenhut-Hüpfer** (Hexenhut auf Füßen), dazu vorhandene Spuke/Kreisgeister/Großspuk in Halloween-Farben.
- Gimmicks: Laternenlicht (Geisterplattformen nur im Lichtkegel sichtbar und begehbar), Besen-Plattformen (fliegen
  Bahnen), Hexenkessel (Trampolin, Blubber), Kürbis-Kanone, Süßigkeiten-Tür (klingeln = Stampfen/Antippen), rollender
  Riesenkürbis, Spinnennetz-Trampolin, Grabstein-Schalter.
- Boss **Graf Brummbär**: Baron Brummbär (Zylinder, Monokel) im Vampirumhang auf dem Schlossdach; wirft
  Kürbis-Bomben (aufheben, zurückwerfen trifft), fliegt als Fledermaus-Schwarm über die Arena, 3 Treffer; besiegt →
  Fledermäuse flattern davon, Konfetti aus Süßigkeiten.
- **Verkleidung:** In der Halloween-Welt (Karte und Level) tragen die Figuren automatisch Kostüm-Zubehör: Lotti einen
  kleinen Hexenhut (mit ihrer roten Schleife), Greta Katzenohren am pinken Haarreif und einen Katzenschwanz, Pflaume
  ein orange-schwarzes Halstuch und Fledermausflügelchen, Krümel einen Mini-Vampirumhang.

## Präzisierung (Level 5-7, 5-Zug und 5-Burg)

Additiv zur Welt-5-Liste: Titel und Besonderheiten der letzten drei Level der Lila Strand-Insel. Dateien
`src/course/levels/w5/5-7.js`, `5-Zug.js`, `5-Burg.js`, eigene Hilfen `src/course/levels/w5/_helpers_d.js` (kein `LEVEL`,
nur für diese drei Level), Test `tests/course_w5d.mjs`. Kein Motor-Code geändert; alle Sonderteile sind level-lokal
(Hilfsdatei, Haken `LEVEL.prebuild`/`LEVEL.build`/`LEVEL.setup`, `level.onStep`, `view.onFrame`). Mitbenutzt (nur
gelesen/importiert): Welt-4-Hilfen `levels/w4/_helpers_d.js` (Lavasee, Türme, Fackeln, Banner, Ketten), Welt-3-Zughilfen
`levels/w3/_helpers_e.js` (`solveTrainRide`, `trackChunks`, `ZugRoehre`, `zugRules`, `trainCull`, `StaticCullE`),
Spielautomat der Karte `map/slot.js` (`SlotMachine`), Strand-Thema und Meer-Kulisse (`view/theme_beach.js`,
`view/backdrop_w5.js`).

### 5-7 „Auf Zehenspitzen durch die Glutfestung“ (parcours · sneak · course_sneak · 400 s)

- Nacht über Baron Brummbärs Lava-Festung, Parcours nach −Z (≈ 215 m, Burghof y 2, Lava y 0,6): **Startplattform**
  (Übungs-Scheinwerfer ohne Kanonen, Markise als Versteck) → Zugbrücke → **Hof der Arkaden** (Lichtfleck kreist im
  Viereck; unter den gestreiften Arkadendächern bleibt man im Schatten) → **Hof der Wachhäuser** (zwei Lichter queren den
  Weg) → **Bastion** (Checkpoint) → **Hof der rissigen Mauer** → Säulengang mit Verfolger-Licht → **Lavagräben** mit
  schmalen Stegen → **Treppe** (drei Läufe, 15 m, Checkpoint 2 auf dem Absatz) → **Turmterrasse** mit Krümel und Zielmast.
- Entdeckt (Lichtfleck trifft die Figur): Alarmlampen blinken, die Suchkopf-Kanonen der Mauer feuern eine Welle
  (`suchkopf_welle`); Dächer (`daecher`: Kollision mit `camIgnore`, eigenes Mesh mit Durchsicht) verstecken. Lob-Ansage,
  wer einen Hof unentdeckt durchquert (`schleichZaehler`). Gegner: Hackbeil-Pilz 8, Suchkopf-Kanone 13, Scheinwerfer 11.
- Sterne: 0 Sprungfeder vor dem Torturm (Sprung halten) → Turmdach · 1 im Hof der rissigen Mauer im Licht warten, bis ein
  Suchkopf kommt, und ihn gegen den Riss lenken (Mega-Wand bricht) → Rätselbox → **Kletterraum** (x 72): Steinblock-Treppe
  hinauf, bevor die Suchköpfe der zwei Raumkanonen sie zertrümmern; beim Wiederbetreten ist sie wieder heil
  (`kletterRaum`) · 2 auf der Turmterrasse im Licht warten – ein Suchkopf zertrümmert die Steinblock-Mauer, dahinter der
  Stern (`steinStern`; Stampfen allein öffnet sie nicht). Stempel: über den drei ?-Blöcken der Bastion, genau im
  Lichtkegel.
- Extraleben: unsichtbarer Block über der Zugbrücke, Kiste auf der Lavainsel im Graben (Sprung hinüber, Stampfattacke).
- Kulisse: eigene schiefer-lila Mauern mit Zinnen und Glutschlitzen (`festungsMauern`, ohne Sonnenschatten), lila
  Hofpflaster mit warmem Weg, Laternen, Wimpelleinen über den Höfen, Blumenkübel, Glühwürmchen, Lavafälle.
  Budget: Scheinwerfer-Optik nur bis 34 m um das Blickziel (`scheinwerferSparen`), Alarmlampen nur bis 26 m.

### 5-Zug „Bimmelbahn voller Bitcoins“ (autoscroller · train · course_goldtrain · kein Zeitlimit, 0 Sterne)

- Bonus-Level ohne Gegner, Sterne und Stempel (`starSlots: 0`). Lokale Themen-Variante **Goldküste** (`LEVEL.prebuild`,
  wie das Abendrot in 2-Panzer): Thema `train` im goldenen Spätnachmittag, Farben und Meer des Strand-Themas; das
  gemeinsame Thema bleibt unverändert. Kein Zeitlimit: `timeLimit: 999`, die Uhr bleibt stehen (`ohneZeitlimit`), die
  Uhr-Anzeige zeigt in diesem Level „– – –“.
- Goldzug (14 Wagen, ≈ 133 m, Zug-Koordinate c ab dem Heck): Startwagen A1 → Goldwagen G1/G2 → **Felswagen F1** → G3/G4 →
  **Röhrenwagen R1** → G5–G7 (Kontrollpunkt auf G5) → **Blockwagen B1** → G8 → Tender → Lok. Goldwagen und Lok zeigen das
  Modell `goldzug_waggon` (Kollision über unsichtbare Teile: Münzberg 2,9 m, Führerhaus-Dach 3,5 m), Flachwagen das
  Welt-3-Modell. Fahrplan (`solveTrainRide`, Gleis und Fensterpfad bei x 0): Halte-Pausen am Felswagen 5 s, Röhrenwagen
  9 s, Blockwagen 8 s; Fahrt ≈ 86 s, ≈ 510 m an der Goldküste (Sandstreifen, drei Lagunen auf Holzgerüsten mit
  Schwimmringen, Entchen und Segelbooten, Strandhäuschen, Leuchtturm, Wimpelketten, Palmen).
- Geheimnisse: **goldener Schalter in der Felsspalte** (Bauplan: goldener Druckschalter in einer Felsspalte, `ZugGoldschalter`):
  hineinspringen oder stampfen (Daraufstellen genügt nicht) → 8 s Goldregen, 56 Münzen fallen über G2–G4 und fahren mit
  dem Wagen darunter mit · **geheime Röhre** in der Kistenburg des Röhrenwagens (nur von oben erreichbar) → **Wolkenwagen**
  (unsichtbares Fahrzeug links oberhalb des Zugs, Optik `WolkenWagen` mit Durchsicht): 33 Münzen und ein Extraleben,
  goldene Rückröhre auf G6 · Blockwagen: ?-Block (Funkenblüte), Dauer-Münzblock, Roulette-Block · unsichtbarer Block mit
  Extraleben über G8.
- Am Muschelkap hält der Zug; die goldene Röhre auf dem Bahnsteig führt in den **Glücksgarten**: Glückshaus mit dem
  Spielautomaten der Karte (`gluecksHaus` → `SlotMachine`): mit einem Sprung auf der Matte landen zieht den Hebel,
  Einsatz 10 Bitcoins dieses Levels (sonst Hinweis), Gewinne wie auf der Karte (3 × Bitcoin +30, 3 × Herz Extraleben,
  3 × Power-up fürs nächste Level, Paar = Einsatz zurück). Zielmast im Garten.
- Wer nicht einsteigt, wird nach der Abfahrt (3 s) ans Bahnsteigende geschoben und fällt in die Lagune.

### 5-Burg „Rumpeltempel des Kippquader-Königs“ (parcours + boss · temple · course_temple · 400 s, ab 100 Sternen)

- Goldener Ruinen-Tempel, Parcours nach −Z (Plätze y 2, ab Warp-Box 1 y 4): **Vorhof** (Übungs-Kippquader, ?-Blöcke) →
  **Bullenplatz** (zwei Rammbock-Bullen, Kippquader am Rand) → bewegliche Plattform → **Sternring-Platz** → Warp-Box 1 über
  die eingestürzte Brücke → **Galerie** (Checkpoint) → **Gang der Wandspalten** (drei Kippquader kippen aus Nischen) →
  **Platz der Mutprobe** und **Würfel-Ring** (zwei 2-m-Würfel rollen um den Mittelpfeiler) → Platz mit Kletterturm und
  Warp-Box 2 → **Bossarena** (20 × 20 m, wie Testlevel 0-19, Checkpoint am Steg) → Baron-Auftritt → Warp-Box →
  Zielplateau.
- Boss Kippquader-König: wandert, der rote Boden zeigt die Landestelle; Treffer nur per Sprung auf das blaue Sternfeld auf
  seinem Rücken, drei Treffer, nach jedem brechen Arena-Ecken weg (`bruchplatte`), zwei Begleit-Kippquader. Danach braust
  Baron Brummbär auf der Brücke hinter der Arena heran, schimpft und fährt davon (`baronAuftritt`, Banner „Welt 5
  geschafft!“).
- Sterne: 0 Sternring (acht Sternmünzen in 10 s, zwei auf Säulenstümpfen) · 1 **Mutprobe**: auf dem grünen Stern im Loch
  des Rahmen-Kippquaders stehen bleiben, er fällt über die Figur (nur wer beim Kippen im Loch stand, bekommt ihn:
  `lochStern`) · 2 Krallen-Anzug aus dem ?-Block, Kletterwand neben Warp-Box 2 hinauf (Bauplan „Wand neben Warp-Box 2“).
  Stempel: vom rollenden Würfel auf den Wandsims (vom Boden aus zu hoch).
- Extraleben: unsichtbarer Block neben den ?-Blöcken im Vorhof, Kiste auf dem Mittelpfeiler des Würfel-Rings.
- Farbtupfer: Tempeltore mit türkisem Fries und Sonnenscheibe (Sturz wird durchsichtig, wenn er die Figur verdeckt:
  `tempelTore`), Mosaikwege in Türkis/Lila/Gold, Blumenkübel, lila und türkise Wandtücher; Gangwände 3,2 m hoch (die
  Kamera sieht über sie hinweg).

### Test `tests/course_w5d.mjs`

Port 4500 (+ `PORT_BASE`), Aufruf `node tests/course_w5d.mjs [5-7|5-Zug|5-Burg]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,shots` (je Lauf < 10 min), `HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`,
`SHOTS='a|b'`, `DETAIL=1`, `TRACE=1` (5-Zug: feine Bot-Spur), Bilder `tests/out/w5d_*.png`. Bot mit echter Eingabe
(`setInput`/`step`, Stick relativ zur Kamera-Gier); Beine u. a. `lure` (im Licht auf einen Suchkopf warten, ausweichen),
`bounce` (Sprungfeder), `warp`, `mover`, `climb`, `cube` (Würfel-Ring), `boss` (Kampf: nur Sprünge auf das Rückenfeld).
5-Zug eigener Ablauf (`installZug`/`zugSuite`): Zug-Koordinaten, Spur-Bot über den fahrenden Zug (Lücken- und
Klettersprünge), Messgang während der Fahrt, Sammel-Bot (hinterstes Ziel vor der hinteren Fenstergrenze).
Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel (5-7 ≈ 30 s,
5-Burg ≈ 66 s mit Bosskampf ≈ 22 s, 5-Zug Fahrt bis zum Halt, Röhre, eine Drehung am Automaten, Zielmast); alle Sterne,
Stempel und Extraleben samt Gegenproben (Stern 0 nicht ohne Feder, Rätselbox nicht bei stehender Mauer, Stern 2 nicht
durch Stampfen, Mutprobe nicht neben dem Loch, Stern 2 nicht ohne Krallen, Stempel nicht vom Boden, Schalter nicht durch
Daraufstellen, Röhre nicht vom Deck aus, Automat nicht ohne 10 Bitcoins); Extras (Schleichen/Entdeckt/Verfolger,
Kletterraum heilt, Checkpoints, Kippquader trifft, Tod im Kampf → Neustart am Steg, König wieder 3/3; kein Zeitlimit,
Abfahrt ohne Einsteigen, Kontrollpunkt auf dem fahrenden Zug). Gemessen (scale 2, inkl. Schattenpass): 5-7 54–109
Zeichenaufrufe / ≤ 233 k Dreiecke (Torturm-Dach mit Blick über zwei Höfe) · 5-Zug ≤ 78 / ≤ 244 k (Messgang während der
Fahrt) · 5-Burg ≤ 86 / ≤ 143 k. Die Heldin (Figurenstil) braucht allein ≈ 20 Zeichenaufrufe.

## Präzisierung (Level 5-5, 5-B und 5-6)

Additiv zur Welt-5-Liste: Titel und Besonderheiten der Level 5-5, 5-B und 5-6. Dateien `src/course/levels/w5/5-5.js`,
`5-B.js`, `5-6.js`, eigene Hilfen `src/course/levels/w5/_helpers_c.js` (kein `LEVEL`, nur für diese drei Level), Test
`tests/course_w5c.mjs`. Kein Motor-Code geändert; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.build`/`LEVEL.setup`).

### 5-5 „Kawumm im Kristallstollen“ (parcours · mine · course_mine · 400 s)

- Bergwerk unter der Lila Strand-Insel, ≈ 230 m nach −Z, drei Stufen hinab (y 1 → −4 → −8) und per Röhre hinauf zum
  Ausgang (y 3). Abschnitte: **Stolleneingang** (Grubenbalken mit Lampen, abgestellte Kristall-Lore; der POW vor dem
  lila Ziegeltor zwischen zwei Felspfeilern öffnet es – Einführung) → **Kristallschlucht** (Lore 1 längs, Mittelinsel mit
  Schnappblume, Lore 2 quer auf Gleisgerüsten, Feuer-Schnappblume auf dem Felsvorsprung, leuchtender Kristallsee tief
  unten) → **Sims B** (lila Ziegelwand vor der Glasröhre zum Kristallbalkon, Nachschub-Röhre für Zündköpfe, zweite
  Glasröhre über die Felswand in die Halle) → **Kristallhalle** (Checkpoint, Wolkenkanone zur Empore, Glühpilz-Wiese mit
  zwei Hasen, rissige Felswand, Nebengleis, Pilzlingstürme) → **Boost-Feld** (Rampe mit zwei Boost-Platten, 14-m-Sprung;
  zu kurz = weiche Grube mit Treppe zurück) → **Landesims** (?-Block mit Funkelstern, POW gegen zwei Pilzlingstürme,
  Röhre) → **Stollenausgang** im Lichtschacht („Glück auf!“, Zielmast).
- Sterne: 0 lila Ziegelwand auf Sims B mit POW, geworfenem Zündkopf oder Tatzenhieb öffnen → Glasröhre auf den
  Kristallbalkon · 1 Stern-Hase auf der Glühpilz-Wiese fangen (`reward` als Aktion: der Stern erscheint, wo er gefangen
  wurde) · 2 Wolkenkanone auf die Empore, Farbfeld 3 × 3 ganz färben. Stempel: **rissige Wand** (`risswand`: Form mit
  `breakable: 'bomb'`, `owner.onHit` bricht nur bei `'bomb'`/`'mega'` – Zündkopf dagegen werfen; Stampfen und Kopfstoß
  lassen sie stehen) → Geheimgang zur Stempelkammer.
- Extraleben: versteckter Block über der Mittelinsel, zweiter Hase auf der Wiese. Gegner: Zündkopf 3 (+ 2
  Nachschub-Röhren `zuendkopf_quelle`, `range` 10), Pilzlingsturm 4, Schnappblume 5, Feuer-Schnappblume 2; POW 5.
- Hilfen: `rails` (Schienen, Schwellen, Gerüst, Prellböcke), `lore` (MovingBox + PathMover, Modell `lore`, trägt die
  Figur), `parkedLore`, `risswand`, `crystals`, `dripstones`, `glowShrooms`, `oreVeins`, `walkways`, `floorStones`,
  `brickPanels` (Ziegel als Flächen statt Kästen – Dreiecksbudget), `wallTimbers`, `crystalLake`, `lampHalos`,
  `lightPools` (warme Lichtkegel unter den Grubenlampen, additiv, ein Objekt), `lightShaft`, `sparkleField` (Punkte mit
  fester Hüllkugel: außerhalb des Bildes kein Zeichenaufruf).

### 5-B „Wackelturm am Glutsee“ (arena · lava · course_arena · 100 s, 1 Stern)

- Weite, wellig gerandete Felsfläche (R ≈ 11,8 m, `rockIsland`) im Glutsee; Basaltwaben, glimmende Spalten, lila
  Kristalle, Lager der Werfer-Bande, Kraterwand mit Lavafällen, Vulkane. **Werferturm** aus 9 Pilzlingen mit Feuer-Werfer
  obenauf (`werferturm` count 9, `riderId`), die Arena zählt Turm und Werfer („noch 2“). Zwei **Steinsäulen**
  (`steinsaeule`: MovingBox, deren Höhe je Schritt wächst/schrumpft, `mover.dy` trägt die Figur; Zustände
  low/up/high/down) hinten links und rechts steigen im Wechsel bis 7,6 m – nie beide oben. ?-Block mit Funkenblüte,
  Münzblock. Konter: von der steigenden Säule auf den Werfer springen, dann den Turm Stufe für Stufe abtragen (oder mit
  Feuerbällen einzeln abschießen); Stern in der Mitte.
- `arenaTowerFix(level, towerId, riderId)`: Der Arena-Archetyp setzt bei Tod aus den gezählten Specs zurück; die vom Turm
  erzeugte Reiter-Spec hat kein `kind` (Warnung „unbekannte Entität“, sonst doppelter Werfer). Der Haken filtert Specs ohne
  `kind`, entfernt überzählige Werfer und zählt den neuen Reiter mit.

### 5-6 „Flipp-Flapp-Tortenland“ (parcours · cake · course_cake · 400 s)

- Torten-Welt mit Rot-Blau-Flippern (`flipperStart: 'rot'`; jeder Sprung – auch eines Klons – wechselt die feste Farbe),
  ≈ 215 m nach −Z, stufenweise hinauf (y 1 → 4 → 9 → 12). Abschnitte: **Tortenstart** (Regel-Schild) und Übungsfeld über
  einer harmlosen Sahnemulde → **Rot-Blau-Felder** (Feld 1: 5 × 6 Schachbrett, Feld 2: 6 × 6 mit Lücken) → **?-Insel**
  (Spiegelfrucht, Münzen, Funkenblüte) → **Wechselplattformen I** (sechs, Zickzack) → **Sahnehang** → **Checkpoint**
  (Röhre mit Schnappblume zur Konditorei) → **Feuerring-Platz** (zwei versetzte Puls-Ringe, ein Flammenrad, Pilzlinge,
  Schnappblumen) → **Wechselplattformen II**, **Sternring-Torte**, **Wechselplattformen III** → **Zieltorte** (2er-Lift,
  Stempel-Etage, Zielmast). Konditorei (Kugel-Raum) abseits bei x ≈ 70.
- Sterne: 0 blaues Feld in der hinteren linken Ecke von Feld 2 · 1 Schnappblume auf der Röhre besiegen, in der
  Konditorei die Bonbon-Kugel (`schiebekugel`) um die Zuckerwürfel-Mauer auf das P-Feld schieben · 2 Sternring (acht
  Sternmünzen in 10 s, drei davon über den Wechselplattformen III; Flammenrad mit zwei Lücken in der Tortenmitte).
  Stempel: Spiegelfrucht auf der Zieltorte, mit dem Klon auf den **2er-Lift** (`multilift` need 2) → Stempel-Etage.
- Feuerring-Platz fair: am Rand warten, bis der Puls-Ring groß ist, und über die Flammen springen (Füße über
  0,8 × Flammenhöhe); das Flammenrad überspringen oder die Lücke nutzen.
- Extraleben: versteckter Block über der Startplatte; Ziegel über der Mauerlücke in der Konditorei (das Extraleben läuft
  über die Blöcke, fällt in die Lücke und kommt zurück). Gegner: Feuerring 4, Schnappblume 3, Pilzling 7.
- Budget/Zier: Flipper werfen keinen Sonnenschatten (`flipperNoShadow`), Feuerringe und Gegner `farHide: 46`;
  Glasur-Kacheln je Tortenplatte in eigener Sorte (`glazeTops`: Erdbeer, Minze, Blaubeer, Zitrone, Lavendel, Karamell),
  schwebende Macarons und Donuts (`floatingSweets`), Sahnetupfen, Glasur, Streusel, Kerzen, Etagentorten.

### Test `tests/course_w5c.mjs`

Port 4490 (+ `PORT_BASE`), Aufruf `node tests/course_w5c.mjs [5-5|5-B|5-6]`, Teilläufe
`PARTS=route,sweep,targets,extra,shots,arena` (je Lauf < 10 min; der Messgang `sweep` folgt der Spur von `route`),
`HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`, `DETAIL=1` (Zeichenaufrufe je Objekt), Bilder `tests/out/w5c_*.png`.
Bot mit echter Eingabe (`setInput`/`step`, Stick relativ zur Kamera-Gier); Beine u. a. `mover` (Lore abwarten,
aufspringen, mitfahren), `pickup`/`throwAt` (Zündkopf), `enter` (Glasröhre), `cannon`, `chaseId` (Hase), `tile`
(Flipper-Hüpfer: Zielfarbe muss vor dem Sprung durchlässig sein), `push` (Kugel), `stompOn`, `dodge`/`dodgeLead`/`speed`
(rechtzeitig springen vor Feuerkugel, Feuerring, Pilzling; Tempo regeln), `pulsWait` (Puls-Ring abwarten, kein Pilzling
quert), Arena-Bot (Säule abwarten, auf den Werfer, Turm abtragen, Stern; Feuerkugeln seitlich zur Inselmitte hin
ausweichen, `ballThreat` rechnet Schwerkraft und Abprall der Kugel voraus). Geprüft: Laden ohne Konsolenfehler, Metadaten,
Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel **ohne einen Treffer** (5-5 ≈ 44 s mit zwei Loren und zwei
Röhren; 5-6 ≈ 59 s, 41 Sprünge = 41 Farbwechsel); alle Sterne und Stempel mit Gegenproben (Röhre hinter der lila Wand
versperrt, rissige Wand hält Stampfen/Kopfstoß, 2er-Lift fährt nicht mit einer Figur); Extraleben; 5-B: Säulen im
Wechsel, Turm 9 + Werfer, Kampf (≈ 53 s, ohne Treffer), Tod setzt zurück (ein Turm, ein Werfer), Zeitlimit 100 s, Funkenblüte.
Gemessen (scale 2, inkl. Schattenpass): 5-5 45–99 Zeichenaufrufe (Bilder an den Stern-Zielen bis 112) /
≤ 233 k Dreiecke · 5-B 50–81 / ≤ 157 k · 5-6 51–106 / ≤ 250 k.
Wünsche an den Motor: `switch_tile` instanzieren (Farbfeld 3 × 3 = 18 Aufrufe), Flipper-Instanzen mit Frustum-Culling
(jedes Feld wird immer gezeichnet), Reiter-Spec des Werferturms mit `kind` (dann entfällt `arenaTowerFix`).

## Präzisierung (Motor und Bausteine Halloween)

Ergänzung des Motor-/Bausteine-Agenten der Halloween-Welt „Kürbisinsel“ (Stand: Halloween-Werkstatt `0-20`). Nichts oben
Festgelegtes wird geändert; alles ist additiv. Alle Halloween-Mechaniken sind parametrierbare Module, Level-Bauer setzen sie
nur in Daten ein. Jede Datei dokumentiert ihre Parameter vollständig im Kopfkommentar; hier die Felder mit Beispielen.
Aktionen im bekannten Format (Präzisierung Sonder-Bausteine, mit `{ signal }` aus Welt 5). Entitäts-Gimmicks sind auch als
`type` in `segments` erlaubt (`hw_misc.js`), die Bausteine `geisterplattform`, `besen_plattform`, `hexenkessel`,
`spinnennetz_trampolin`, `kuerbis_kanone`, `riesenkuerbis_roll` auch als `kind` (Hülle wie Welt 5).

### Präzisierung (Motor und Bausteine Halloween): Dateien

```
src/course/blocks/hwkit.js               HWC (Farben), hwSfx (Halloween-Klang mit Ersatz), modelOr, pumpkinGeo/faceGeo,
                                         lanternParts, candyGeo, softTexture/fogTexture, hwLight (Laternenlicht-System),
                                         ghostBatch (Geisterplatten in einem Shader-Mesh), hwHud (Zähler oben rechts),
                                         modelGeometry/modelBox/ghostGeometry/bakeInstanced (Registry-Modelle backen)
src/course/blocks/types/hw_light.js      laternenlicht, geisterplattform
src/course/blocks/types/hw_broom.js      besen_plattform
src/course/blocks/types/hw_cauldron.js   hexenkessel (+ Zaubertrank-Blasen), spinnennetz_trampolin
src/course/blocks/types/hw_cannon.js     kuerbis_kanone (Röhrenkanone aus w5_savanna.js, Mechanik unverändert)
src/course/blocks/types/hw_glibber.js    glibberbach (Rasterfluss aus river.js als Glibber), nebel
src/course/blocks/types/hw_misc.js       riesenkuerbis_roll (Spender) + Entitäts-Gimmicks als segments-type
src/course/blocks/types/deco_hw.js       Kulisse Halloween (verschmolzen; shadow: false für ferne Kulisse)
src/course/entities/kinds/hw_gimmicks.js laterne, laternenpfahl, suessigkeit(en), suessigkeiten_tuer, grabstein_schalter,
                                         riesenkuerbis + kind-Hüllen der Halloween-Bausteine
src/course/view/theme_pumpkin|pumpkin_night|candyvillage|graveyard|witchtower|castle_night.js, backdrop_hw.js
src/course/levels/w0/0-20.js             Halloween-Werkstatt (eine Station je Mechanik, marks für den Test)
tests/course_hw_blocks.mjs               Port 4530, Bilder tests/out/hwb_*.png (je Thema hwb_thema_*.png)
```

Additiv geändert: `view/themes.js` (6 Registrierzeilen, `??=`). Kein Motor-Code geändert: `src/three/*`, Modelle, Audio,
Karte, Player/HeroRig und die Welt-5-Bausteine bleiben unverändert (die Kürbis-Kanone nutzt `buildRoehrenkanone` über eine
Level-Hülle ohne Ansicht und zeichnet selbst; der Glibberbach baut den Rasterfluss `river` und wandelt dessen Wasserzellen
beim Anlegen in Glibber-Formen um).

### Präzisierung (Motor und Bausteine Halloween): Laternenlicht

`hwLight(level)` (= `level.hwLight`, eines je Level, entsteht mit dem ersten Halloween-Baustein) sammelt je
Simulationsschritt die Lichtquellen `list = [{ x, y, z, r, kind }]`:

| Quelle | kind | Lage / Radius |
| --- | --- | --- |
| Handlaterne jeder Figur (auch Klone), sobald `carried` | `'figur'` | Handhöhe (0,62 · Figurhöhe), `radius` (Standard 5 m) |
| Licht-Helm (Motor Welt 2) | `'helm'` | drei Lichtkugeln entlang des Kegels (1,6 / 3,6 / 5,6 m, Radius 0,5 + 0,52 · Abstand) |
| Laternenpfahl (Entität) | `'pfahl'` | Lampe, eigener `radius` (Standard 4,5 m), nur wenn an |
| Höhlen-Laterne `lantern` (Welt 1), angezündet | `'laterne'` | Lampe, ihr `radius` |

`at(x, y, z)` und `box({ x0, x1, y0, y1, z0, z1 }, kinds?)` liefern 0..1 (Abstand mit gestauchter Höhe dy · 0,7, weicher
Rand `soft` 1,2 m); `carry(on)`, `configure({ radius, soft, carry, lose, helmet })`, `info()`. Tragen: Item `laterne`
oder `LEVEL.lantern = true | { carry, radius, soft, lose, helmet }` bzw. Baustein `laternenlicht`. Mit `lose: true` geht
die Laterne beim Tod verloren und das Item erscheint wieder. Darstellung: Handlaterne an der rechten Hand jeder Figur
(pendelt, Modell `laterne_hand`), warmer Lichtkreis am Boden unter jeder Quelle (eine InstancedMesh), das Figurenlicht des
Themas (`playerLight`) wird zur warmen Laterne in der Hand; Laternenpfähle nutzen `view.addLantern` (Punktlicht im Thema mit
`lanternLight`).

**Schnittstelle für Figuren-/Kostüm-Agenten:** `player.hwLantern` ist `true`, solange die Figur eine Laterne trägt (je
Schritt gesetzt). Hält der Avatar die Laterne selbst (Hand-Pose, eigenes Modell), `level.hwLight.handLantern = false`
setzen – dann zeichnen die Bausteine keine eigene Handlaterne (Licht und Lichtkreis bleiben).

**Geisterplattformen** zeichnet ein gemeinsames Shader-Mesh (`ghostBatch`, ein Zeichenaufruf für bis zu 64 Platten):
Lichtmaske je Pixel aus den nächsten 8 Quellen (heller Rand am Lichtkreis, Funkeln), dazu je Platte eine
Grund-Sichtbarkeit (0,3 im Licht, Flackern in der Vorwarnung), im Dunkeln ein zarter Schimmer (`hint`).

### Präzisierung (Motor und Bausteine Halloween): Signale, Zähler, HUD, Klänge

- **`level.signal('klingeln', { id, group, content, n, of, pos, via, source })`** je geklingelter Tür (`via` = `'walk'` |
  `'stomp'` | `'tap'` | `'action'` | `'code'`; `content` = tatsächlicher Inhalt, z. B. `'pilzling'` als Ersatz für den
  Kürbling); Zähler `level.hwDoors[group] = { n, of, done }`; sind alle Türen der Gruppe geklingelt, laufen die
  `onAll`-Aktionen ihrer Türen. Für Level-Aufgaben („alle 8 Türen“) genügt `onAll` bzw. `level.onSignal('klingeln', …)`.
- **Schnittstelle für den Gegner-Agenten:** `content: 'kuerbling'` erzeugt `level.spawn('kuerbling', { …enemy, pos (1,1 m
  vor der Tür), yaw (Blick aus der Tür), dir: [dx, dz], fromDoor: id | true })` – `fromDoor` erlaubt eine eigene
  Heraushüpf-Animation; bis es `kuerbling` gibt, kommt `pilzling`.
- Grabstein-Schalter: optional `signal: name` → `level.signal(name, { pos, source, via, pressed })` beim Drücken und
  Loslassen (`pressed: false`).
- `level.hwCandy` zählt gesammelte Süßigkeiten (jede +1 Bitcoin über `level.addCoins(1)`).
- **HUD** `hwHud(level).set(key, { text, icon: 'tuer' | 'bonbon' | 'kuerbis' | 'laterne', done, color, hold })` – Zeilen
  oben rechts (unter einer evtl. Schlüssel-Anzeige); Türen zeigen „Türen n/N“ (`hud: false` schaltet ab), Süßigkeiten
  „Süßes n“ mit `LEVEL.candyHud: true`. `state()` für Tests.
- **Klänge** über `hwSfx(level, name, ersatz)`: spielt den Halloween-Klang, sobald es ihn in `src/audio` gibt, sonst den
  Ersatz: `suessigkeit` (berry), `klingel` (key), `tuer` (gate), `muenzregen` (coin), `buh` (ghost), `alle_tueren` (key),
  `laterne` (light), `laterne_aus` (vanish), `kessel` (bounce), `netz` (bounce), `blase` (vanish), `grabstein` (ghost),
  `kuerbis_platzt` (brickbreak). Wunsch an den Audio-Agenten: diese Namen als eigene Effekte.

### Präzisierung (Motor und Bausteine Halloween): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `laternenlicht` (type) | stellt das Laternenlicht ein | `radius` 5, `soft` 1.2, `carry` false, `lose` false, `helmet` true | `{ type: 'laternenlicht', radius: 5 }` |
| `laterne` (kind; auch type) | Handlaterne zum Aufheben → alle Figuren tragen eine | `pos` (Fußpunkt, schwebt darüber), `radius` (setzt den Lichtradius), `banner` 'Laterne!' ('' = keine), `id`, `hidden` | `{ kind: 'laterne', pos: [0,1,-11] }` |
| `laternenpfahl` (kind; auch type) | feste Laterne auf Pfahl, Lichtquelle; blinkt mit Vorwarnung; schaltbar | `pos`, `radius` 4.5, `height` 2.4, `on` true, `blink` null \| [an, aus], `phase`, `warn` 0.6, `style` 'kuerbis' \| 'laterne', `yaw` (Arm-Richtung, −π/2), `id` → `{ on, toggles, toggle(), start(), stop(), info() }`; Feuer/Tatze zündet an | `{ kind: 'laternenpfahl', id: 'pfahl1', pos: [-5.2,1,-40], radius: 6, blink: [4, 2.5], yaw: 0 }` |
| `geisterplattform` | nur im Licht sichtbar und begehbar, Vorwarnung, wird nicht fest, solange eine Figur darin steckt | `pos`+`size` [2.4,0.5,2.4] \| `parts: [{ pos, size }]` \| `from`/`to`/`n`, `linger` 0.8, `hint` 0.06, `color` 'lila' \| 'blau' \| 'gruen', `light` 'alle' \| 'laterne' \| 'pfahl', `face` true, `oneWay`, `always`, `id` → `{ parts: [{ lit, k, solid, warn, waits }], lit, solid, info() }`; Form tag `geisterplattform` | `{ type: 'geisterplattform', id: 'geist1', light: 'laterne', from: [0,0.5,-16.5], to: [0,0.5,-26.5], n: 4 }` |
| `besen_plattform` | fliegender Hexenbesen mit Sitzbrett trägt die Figur (mover), wippt, neigt sich, dreht an den Enden | `path` (Mitte Unterseite), `size` [3, 1.3] (Länge × Breite), `thick` 0.35, `axis` 'auto' \| 'x' \| 'z', `speed` 2.5, `wait` 0.8, `mode` 'pingpong' \| 'loop', `phase`, `start` 'auto' \| 'stand' \| 'signal', `once`, `bob` 0.06, `tilt` 7, `reset` true, `color` 'lila' \| 'rot' \| 'gruen', `trail` true, `id` → `{ pos, mover, shape, running, riders, rides, start(), stop(), reset(), info() }` | `{ type: 'besen_plattform', id: 'besen', path: [[0,0.65,-54.5],[0,1.4,-61],[0,0.65,-67.5]], start: 'stand' }` |
| `hexenkessel` | Trampolin mit Blubber (bounce), Spritzer je Abprall; optional Zaubertrank-Blasen als aufsteigende Plattformen (von unten durchlässig, tragen nach oben, wackeln, platzen) | `pos`, `size` 2, `height` 1.2, `strength` 20 \| `jump` m, `color` 'gruen' \| 'lila' \| 'orange', `light` true, `potions` false \| true \| { `every` 2.6, `rise` 1.6, `height` 8, `size` 1.7, `wobble` 0.7, `max` 3, `offset` [dx,dz], `first` 0.5 }, `id` → `{ bounces, top, strength, bubbles, pops, spawned, info() }`; Formen tag `hexenkessel`, `zaubertrank_blase` | `{ type: 'hexenkessel', id: 'kessel2', pos: [7,1,-93], potions: { every: 2.4, height: 7 } }` |
| `spinnennetz_trampolin` | Netz zwischen vier krummen Pfählen federt (bounce), dellt sich ein, Spinne am Faden | `pos` (Boden unter der Mitte), `size` [3,3], `height` 1, `strength` 17 \| `jump` m, `spider` true, `posts` true, `id` → `{ bounces, sag, top, info() }` | `{ type: 'spinnennetz_trampolin', pos: [-7,1,-91], jump: 5.5 }` |
| `kuerbis_kanone` | Röhrenkanone im Kürbis-Look (Gesicht glüht beim Laden, Deckel mit Stiel lehnt daneben) | Felder von `roehrenkanone` (`pos`, `to`, `arc`, `gravity`, `charge` 0.6, `enter`, `onFire`, `hidden`) + `size` 1.3 (Registry-Modell; Kollision aus dessen Hüllquader) bzw. `height` 2.0, `radius` 1.1 (eigene Optik), `yaw` −π/2 (Gesicht +Z; mit Registry-Modell zum Ziel gedreht), `face` 'grinsen', `color` 'orange' \| 'gelb' \| 'weiss', `mark` true; Griff wie `roehrenkanone` | `{ type: 'kuerbis_kanone', id: 'kanone', pos: [0,1,-104.5], to: [0,1,-134] }` |
| `suessigkeiten_tuer` (kind; auch type) | Haustür mit Häuschen: Stampfen auf die Schwelle / Antippen / Hinlaufen = klingeln → Glocke, Tür auf, Inhalt, Tür zu, Türlampe brennt | `pos` (Schwellenmitte), `yaw` −π/2 (Tür zeigt +Z), `content` 'muenzen' \| 'suesses' \| 'kuerbling' \| 'nichts' \| Gegner-Art \| Aktion, `n` 5, `enemy` {…}, `ring` ['stomp','tap','walk'], `group` 'tueren', `onAll`, `of`, `hud` true, `house` true, `color` 'lila' \| 'orange' \| 'gruen' \| 'blau', `once` true, `id` → `{ state, rings, via, out, lit, info() }` | `{ type: 'suessigkeiten_tuer', id: 'tuer1', pos: [-8,1,-148], yaw: 0, content: 'muenzen', onAll: { coins: 5 } }` |
| `suessigkeit` / `suessigkeiten` (kind; auch type) | Sammel-Item, +1 Bitcoin, `level.hwCandy`, eigener Klang; mit `vel` fliegt es zuerst (erst nach 0,35 s einsammelbar); Figuren im Kanonenflug/Floß sammeln mit | `pos`, `variant` 'bonbon' \| 'lolli' \| 'zuckermais' \| 'schoko', `vel`, `hidden`; Reihe/Kreis `from`/`to`/`n` \| `pos`/`r`/`n` | `{ kind: 'suessigkeiten', from: [-3,1,-2], to: [3,1,-2], n: 4 }` |
| `riesenkuerbis` (kind; auch type) | rollender Riesenkürbis (auf der Seite, wie ein Rad): bergab schneller, seitlich Treffer + Stoß, von oben Abprall, Stampfen/Angriffe zerplatzen ihn; Wand/Lava/Glibber/Abgrund/`life` → platzt | `pos`, `dir` \| `yaw`, `size` 1.8, `speed` 3, `max` 9, `path` (Bodenpunkte; folgt kinematisch, bergab schneller, platzt am Ende), `life` 16, `hurt` true (false = nur wegstoßen), `face` true, `drop` (Aktion), `color`, `id` → `{ state, rolled, speed(), info() }` | `{ kind: 'riesenkuerbis', pos: [0,1,-194], dir: [1,0] }` |
| `riesenkuerbis_roll` | Spender (Holzverschlag mit Kürbisstapel) stößt Riesenkürbisse aus; ohne `every` ein einzelner (respawn) | `pos` (Austritt), `dir` \| `yaw`, `every` 3.5 (0 = einzeln), `first` 0.5, `max` 3, `start` 'auto' \| 'near' \| 'signal', `near` 20, `spawner` true, `respawn` 0, `vmax`, …Kürbis-Felder, `id` → `{ spawned, alive, running, start(), stop(), spawn(), info() }` | `{ type: 'riesenkuerbis_roll', id: 'spender', pos: [-12.6,4,-186], dir: [1,0], every: 4, start: 'near' }` |
| `grabstein_schalter` (kind; auch type) | Druckschalter: Grabplatte vor einem Grabstein mit Lachgesicht; Platte sinkt, Augen leuchten | `pos`, `yaw` −π/2 (Gesicht und Platte zur Kamera), `on`, `off`, `signal`, `time` 0 (Zeitanzeige, dann zurück), `toggle`, `once`, `press` 'stand' \| 'pound', `face` true, `id`, `hidden` → `{ pressed, presses, press(), release(), info() }`; Signale `open`/`toggle`/`start`/`stop` | `{ type: 'grabstein_schalter', id: 'schalter', pos: [-4,1,-205], on: { reveal: 'grabweg' } }` |
| `glibberbach` | grüner Glibber-Bach (Rasterfluss `river` Form B mit Ufern/Strömung): Floß `raft` (Pflaume) fährt darauf, Hineinfallen = Neustart am Checkpoint (`kill: 'glibber'`, deathCause `'fall'`), Gegner versinken, Blasen und Klumpen | `path` (y = Oberfläche), `width` 6, `depth` 2, `speed` 3 \| `speeds`, `bank` 2.5, `bankH` 1, `banks`, `bed`, `open`, `color` 'gruen' \| 'lila', `bubbles` 26, `blobs` 10, `id` → `{ river, sunk, contains(x,z), surfaceAt(x,z), info() }` | `{ type: 'glibberbach', id: 'glibber', path: [[0,-0.5,-239],[0,-0.5,-252],[2.5,-0.6,-262],[0,-0.6,-276]], bankH: 1.5 }` + `{ kind: 'raft', pos: [0,-0.5,-241.5], exit: [0,-0.6,-276], exitR: 0.9 }` |
| `nebel` | Bodennebel-Feld, rein optisch (Schichten, treibt, Ränder weich, um die Figur dünner) | `pos` (Mitte am Boden), `size` [14,14], `height` 1.3, `layers` 3, `density` 0.35, `color` 0xc8d2f4, `drift` [0.25,0.08], `edge` 2 | `{ type: 'nebel', pos: [0,1,-301], size: [24,18] }` |
| `deco_hw` | Kulisse (verschmolzen) | `items: [{ kind, pos, … }]`, `shadow: false`; Arten `kuerbis` (size, shape, color, face), `kuerbisse`, `kuerbislaterne` (mount 'boden' \| 'pfahl', light), `vogelscheuche`, `strohballen` (form 'eckig' \| 'rund'), `maisstaude`, `maisfeld`, `krummer_baum`, `krumme_baeume`, `grabstein` (style 'rund' \| 'kreuz' \| 'spitz', face), `grabsteine`, `zaun` (from, to, style 'holz' \| 'eisen', solid), `spinnweben` (lage 'ecke' \| 'decke'), `kerzen` (n, light), `fledermaus_girlande` (from, to, n, sag), `suessigkeiten` (Haufen), `dorfhaus`, `hexenturm`, `gruft`, `kerzenleuchter` (nur mit Registry-Modell); Streuungen mit `detail: 'voll'` als Einzelmodelle | `{ type: 'deco_hw', items: [{ kind: 'kuerbisse', pos: [-9,1,1], size: [6,8], n: 7, faces: 0.5 }, { kind: 'vogelscheuche', pos: [9.5,1,-1] }] }` |

Hinweise für Level-Bauer: Geisterplatten für die Handlaterne höchstens ≈ 3,5 m auseinander (Radius 5 m, die nächste
Platte muss vor dem Absprung im Licht liegen); `light: 'pfahl'` für Brücken, die nur ein (blinkender) Laternenpfahl zeigt.
Floß-Ende (`exit`) dicht vor die Uferwand legen (das Absteigen springt nur ≈ 1,5 m vor). Türen in Gassen seitlich
(`yaw: 0` bzw. `π`); Hinlaufen braucht den Blick zur Tür.

### Präzisierung (Motor und Bausteine Halloween): Modelle

Die Bausteine übernehmen die Halloween-Modelle der Registry, sobald `hasModel(name)` gilt (sonst eigene Ersatz-Geometrie,
gleiche Kollision und Mechanik). Stand mit den Modellen aus `gimmicks_hw.js`, `props_*_hw.js`:

| Modell | genutzt von | Optionen / Zustand aus dem Baustein |
| --- | --- | --- |
| `laterne_hand` | Handlaterne an jeder Figur (× 0,7), Item `laterne` (× 1,15, ohne eigenen Schein) | state { swing (rad), lit } |
| `kuerbislaterne` | `laternenpfahl` mit `style: 'kuerbis'`; `deco_hw` kuerbislaterne | { mount: 'pfahl' } bzw. { size, mount, face } |
| `laternenpfahl` | `laternenpfahl` (`style: 'laterne'`), noch kein Registry-Modell → eigene Optik | { height, style }; state { lit 0..1 } |
| `geisterplattform` | Form und Farben (einfache Form `ghostPlatformGeo(…, lo)`) im Licht-Shader-Mesh, Farbe lila → 'lila', blau/grün → 'mint', orange | { size: [w, h, d], color } |
| `besen_plattform` | Besen; Ursprung = Brett-Oberseite (Lauffläche) | { length, width, stick: 1,45 · length, color }; state { tilt, roll, bank, speed, moving } |
| `hexenkessel` | Kessel, auf `height` gestreckt (Höhe/userData.top) | { size: 2R / 1,7 }; state { bounce (Einfedern), bubble: 1 } |
| `spinnennetz_trampolin` | Netz (ohne eigene Pfähle) | { radius: min(w, d) / 2, height }; state { bounce: Durchhang / 0,7 } |
| `kuerbis_kanone` | Kanone, dreht zum Ziel, Rohr folgt dem Abschusswinkel; Kollision aus dem Hüllquader des größten Teils | { size 1,3 }; state { anim 'idle' \| 'load' \| 'fire', k, aim (rad) } |
| `suessigkeiten_tuer` | Tür im Häuschen (Wandöffnung mit Vorraum 1,45 m, Tür 1,3 × 2,4 m, öffnet nach innen) | { width, height, color }; state { open, ring, lit } |
| `grabstein_schalter` | Schalter; Kollision aus dem Hüllquader (man kann darauf springen), Knopf = Druckplatte | state { pressed 0..1, glow } |
| `riesenkuerbis_roll` | rollender Riesenkürbis (Spender und `riesenkuerbis`) | { size, color, face }; state { roll (Strecke / Radius), speed, anim 'roll' \| 'burst', progress } |
| `suessigkeit` | Pool-Vorlage der Süßigkeiten | { kind: bonbon → 'bonbon', lolli → 'lolli', zuckermais → 'mais', schoko → 'riegel', color: Index } |

Kulisse `deco_hw`: erst `deco_hw_<kind>`, sonst `kuerbis`, `kuerbislaterne`, `vogelscheuche`, `strohballen` (form → kind),
`maisstaude`, `suessigkeiten_haufen`, `grabstein` (style → kind, tilt, pumpkin), `halloween_baum` (krummer_baum),
`spinnennetz` (spinnweben: 'ecke' → 'ecke', 'decke' → 'rund'), `eisenzaun` (zaun style 'eisen'), `kerzenleuchter`,
`dorfhaus_nacht`, `hexenturm`, `gruft` – gebacken in die statische Geometrie, Kollision bleibt; Gesichter/Türen zeigen ohne
`yaw` zur Kamera (+Z). Die Streuungen `kuerbisse`, `grabsteine`, `maisfeld` backen die einfachere Instanz-Form
(`createInstanced`, `bakeInstanced` in hwkit; ≈ ⅓ der Dreiecke), `detail: 'voll'` nimmt die Einzelmodelle. Neu (nur mit
Registry-Modell): `dorfhaus` (width 3, depth 2.6, height 2.4, color, door, lean), `hexenturm` (height 5, radius 1.3, lean,
windows, part), `gruft` (size), `kerzenleuchter` (arms, height, light). Noch ohne Modell (eigene Optik): Zaubertrank-Blase,
Laternenpfahl-Stil 'laterne', Spender-Verschlag, Glibber, Nebel.

### Präzisierung (Motor und Bausteine Halloween): Themen

| Thema | Stimmung | Kulisse (`buildBackdrop`) |
| --- | --- | --- |
| `pumpkin` | Abendrot: lila Zenit, rosa Band, glühender Orange-Horizont, tiefe warme Sonne mit langen Schatten; herbstliches Grün auf Ackererde; Stimmung `nacht` (view.setMood) | Kürbisfelder mit Furchen bis zum Horizont, Maisreihen, rote Scheunen, lila Hügel, Krähen, fallendes Herbstlaub |
| `pumpkin_night` | Nacht-Variante für das Diorama (H-Kapitän): tiefblau-lila Nacht, Mond mit Gesicht | dieselben Felder, überall leuchtende Kürbisgesichter, Sterne, Glühwürmchen |
| `candyvillage` | sternklare Nacht, Mond mit schläfrig-lächelndem Gesicht, warme Fensterlichter | schiefe Häuschen mit warmen Fenstern und Schornsteinen, runde Bäume, Hügel, Fledermäuse |
| `graveyard` | Mondnacht in kühlem Blau-Lila, Bodennebel | Friedhofshügel mit Grabsteinen und Kreuzen, kahle Bäume, Kapelle mit warmem Fenster, treibende Nebelbänke, Irrlichter |
| `witchtower` | Nacht zwischen lila Wolken, sanfter Blitzschimmer (weich an/ab, kein Knall), grünes Kessellicht von unten | Wolkenbänke und Wolkenmeer, schiefe Hexentürme mit grünen Fenstern, aufsteigende Zaubertrank-Funken |
| `castle_night` | Vollmond über dem Gruselschloss; rote Teppiche mit Goldkante als Decke; Stimmung `innen` (Kerzenschein) | Türme mit lila Spitzdächern und Kerzenfenstern, Hauptburg hinter dem Ziel, Sterne, Fledermäuse |

Alle sechs Themen haben `playerLight` (Figurenlicht) und `lanternLight` und gelten damit als dunkle Themen für den
Spielzeug-Look (kräftigeres Randlicht, Figuren lesbar). Die Werkstatt lässt sich mit `?course=0-20&theme=<name>` in jedem
Thema ansehen.

### Präzisierung (Motor und Bausteine Halloween): Halloween – Gimmick → Baustein

| Level | Gimmick | Bausteine |
| --- | --- | --- |
| H-1 | Kürbisfeld im Abendrot, Kürbis-Hüpfer, rollende Kürbisse, Vogelscheuchen, Laternenpfad | `riesenkuerbis_roll` (Hang, Spender bzw. `path`), `riesenkuerbis`, `laternenpfahl`, `kuerbis_kanone`, `suessigkeiten`, `deco_hw` (kuerbisse, maisfeld, vogelscheuche, strohballen, zaun), Thema `pumpkin` |
| H-2 | Süßes-oder-Saures-Dorf: Türen klingeln → Bitcoins/Süßes oder Kürbling | `suessigkeiten_tuer` (`content`, `group`, `onAll`; Signal `klingeln`), `suessigkeit`, `LEVEL.candyHud`, `deco_hw` (kuerbislaterne, fledermaus_girlande, suessigkeiten, zaun), Thema `candyvillage` |
| H-Kapitän | Krümel mit Laterne im Kürbislabyrinth | `LEVEL.lantern: true` (bzw. `laternenlicht` carry), `geisterplattform`, `laternenpfahl`, `deco_hw` (kuerbisse, maisfeld), Thema `pumpkin_night` (oder `pumpkin` mit `setMood('nacht')`) |
| H-3 | Nebelfriedhof: Laternenlicht zeigt Geisterplattformen, Floß auf dem Glibberbach | `laterne`, `geisterplattform` (`light`), `laternenpfahl` (`blink`), `grabstein_schalter`, `glibberbach` + `raft`, `nebel`, `deco_hw` (grabsteine, krumme_baeume, zaun eisen, spinnweben), Thema `graveyard` |
| H-4 | Hexenturm vertikal: Besen-Plattformen, Hexenkessel-Trampoline, Zaubertrank-Blasen | `besen_plattform`, `hexenkessel` (`potions`), `spinnennetz_trampolin`, `deco_hw` (kerzen, spinnweben), Thema `witchtower` |
| H-Burg | Gruselschloss, Graf Brummbär | `grabstein_schalter`, `laternenpfahl`, `deco_hw` (kerzen, fledermaus_girlande), Thema `castle_night` (`setMood('innen')`) |

### Präzisierung (Motor und Bausteine Halloween): Tests und Kennzahlen

`tests/course_hw_blocks.mjs` (Port 4530, `PORT_BASE`; `HWB_SHOTS=0` ohne Bilder, `HWB_PART=mech|themes` je Teil, je unter
10 min, `HWB_DEBUG=1`): deterministisch über `step(n)`/`setInput` in der Halloween-Werkstatt `0-20` – Geisterplattform
(ohne Laterne fällt die Figur hindurch, Laterne aufheben, mit Laterne fest und nur im Radius, Vorwarnung 0,8 s, wird nicht
fest, solange die Figur darin steckt), blinkender Laternenpfahl (Brücke nur bei Licht, Handlaterne allein zeigt sie nicht),
Besen (startet beim Draufstellen, trägt über die Schlucht), Hexenkessel (+7,4 m), Zaubertrank-Blase (trägt ≈ 3 m nach oben,
platzt), Spinnennetz (+5,5 m), Kürbis-Kanone (lädt, Flug im Zustand `cannon`, landet genau), drei Türen (Hinlaufen →
Bitcoins, Stampfen → sechs Süßigkeiten fliegen heraus, Antippen → Gegner; Signale `klingeln` 1/3 … 3/3, `onAll`, HUD),
Süßigkeiten (+1 Bitcoin je Stück, HUD „Süßes n“), Riesenkürbis (Spender startet in der Nähe, bergab bis 9 m/s, Treffer,
Stampfen zerplatzt ihn, Bahn `path`), Grabstein-Schalter (Weg erscheint, Signal; Zeit-Schalter mit Laternenpfahl),
Glibberbach (Hineinfallen = Neustart am Checkpoint, Floßfahrt mit Pflaume bis ans Ende, Gegner versinken), Nebel, Ziel,
keine Konsolenfehler (37 Prüfungen); dazu Themen-Bilder aller sechs Themen (4 Prüfungen). Kennzahlen mit den
Registry-Modellen (960×540, scale 2, inkl. Schattenpass): Stationen 39–70 Zeichenaufrufe, 89–201 k Dreiecke (Türen am
meisten); Themen-Bilder 51–73 Aufrufe, 94–181 k Dreiecke (Budget < 120 / < 300 k). Teuer sind einzelne Kulissenmodelle
(Vogelscheuche ≈ 9 k, Dorfhaus ≈ 11 k, Tür ≈ 10,5 k, Riesenkürbis ≈ 11,5 k): für viele Stücke die Streuungen nehmen.

## Präzisierung (Gegner Halloween)

Ergänzung des Gegner-Agenten der Halloween-Welt „Kürbisinsel“ (Stand: Gruselwerkstatt `0-21`, Schlossdach des Grafen
`0-22`). Nichts oben Festgelegtes wird geändert; alles ist additiv. Level-Bauer schreiben nur Daten; alle Felder sind
optional, sofern nicht anders vermerkt. Gemeinsame Felder und Konter aus „Präzisierung (Gegner/Power-ups)“ und „(Gegner
Welt 2–5)“ gelten weiter (`id, pos, dir|yaw, path, loop, wake, edges, drop`; Ziel = nächste Figur, Lava/Absturz = besiegt,
`STRONG` = cannon, bomb, mega, star). Jede Datei dokumentiert ihre Parameter vollständig im Kopfkommentar. Kindgerecht:
niemand erschrickt – Kürblinge zerplatzen in Kerne und Bitcoins, Skelette fallen klappernd um, der Graf fliegt als
lustiger Fledermaus-Schwarm mit Zylinder.

### Präzisierung (Gegner Halloween): Dateien

```
src/course/entities/kinds/huepfer_hw.js            kuerbling (+ Riesenkürbling: riese: true bzw. kind 'riesenkuerbling'),
                                                   hexenhut_huepfer
src/course/entities/kinds/klapperknochen_hw.js     klapperknochen
src/course/entities/kinds/flatterfledi_hw.js       flatterfledi, flatterfledi_schwarm (Glieder 'flatterfledi_glied');
                                                   Hilfen BatFlockView (Instanz-Gruppe), Klasse Flatterfledi
src/course/entities/kinds/graf_brummbaer_hw.js     graf_brummbaer (Boss H-Burg, Schwarm-Glieder 'graf_fledermaus'),
                                                   kuerbis_bombe
src/course/entities/kinds/spuk.js                  + Option halloween (spuk/Großspuk, kreisgeist, kreisgeist_kreis);
                                                   isHalloweenLevel(level)
src/course/levels/w0/0-21.js                       Gruselwerkstatt (5 Reihen Gehege, Z(r, dz) wie 0-18, LEVEL.halloween,
                                                   Thema pumpkin)
src/course/levels/w0/0-22.js                       Schlossdach des Grafen (Archetyp boss, runde Arena mit Zinnen im Haken
                                                   build, Thema castle_night, Vollmond)
tests/course_hw_enemies.mjs                        Port 4540, HWE_PART=1|2|3|4, Bilder tests/out/hwe_*.png
```

Modelle (fertig, `src/course/models/kinds/*_hw.js`): `kuerbling`, `klapperknochen`, `flatterfledi`, `hexenhut_huepfer`,
`spuk_halloween`, `kreisgeist_halloween`, `kreisgeist_kreis_halloween`, `graf_brummbaer` (`model.hand()`), `kuerbis_bombe`,
`fledermaus_schwarm` (Anführer mit Zylinder), `bonbon_konfetti`; Landemarkierung `boss_marker`. Kein Ersatzmodell nötig.
Die Hüpfer setzen `state.height: 0` und `progress` aus der Simulation (die Höhe des Hüpfers ist echte Bewegung, die
Trefferzone springt mit).

### Präzisierung (Gegner Halloween): gemeinsame Regeln

- **Halloween-Optik automatisch:** `spuk`, `kreisgeist`, `kreisgeist_kreis` zeichnen in der Halloween-Welt (LEVEL.world
  31, Id `H-…` oder `LEVEL.halloween: true`) die Halloween-Modelle; je Gegner überschreibbar mit `halloween: true|false`,
  Spuk zusätzlich `hat: 'kuerbis' (Standard) | 'hexe' | 'kein'`. Verhalten unverändert (Großspuk = `spuk` mit `size: 2.5`).
- **Hüpfen:** Kürbling und Hexenhut-Hüpfer bewegen sich nur in Hüpfern (ducken 0,1 s → Bogen → landen 0,1 s → Pause);
  an Kanten springen sie nicht hinunter (`edges: false` erlaubt es), Bahnen (`path`) treffen sie Wegpunkt für Wegpunkt.
- **Tragen/Werfen** der Kürbis-Bombe über das Trage-System (wie Zündkopf): Aktion in Reichweite bzw. Rennen + Berührung
  hebt auf (zündet; Lunte dann ≥ `carryFuse`), Aktion wirft, Ducken + Aktion setzt ab. Geworfen explodiert sie am ersten
  Hindernis (Wand, Gegner, Endgegner – `onBombHit(bomb)` vorher). **Zielhilfe:** liegt ein Endgegner (`boss` +
  `onBombHit`) höchstens 40° neben der Wurfrichtung und ≤ 10 m weit, fliegt die Bombe im Bogen zu ihm (`assisted`).
- **Explosion** der Kürbis-Bombe: `explodeAt` aus `zuendkopf_w5.js` (Radius 1,5 m; Gegner `onHit('bomb')`, Zerbrechliches,
  Figuren bis 0,9 × Radius, `level.onExplosion`) mit eigener Wirkung (lila-oranger Puff des Modells, Funken, Stückchen).
- **Fledermaus-Schwärme** (`flatterfledi_schwarm`, Schwarm des Grafen) zeichnen alle Glieder als **eine Instanz-Gruppe**
  (`BatFlockView` über `modelInstances('flatterfledi')`, ≈ 5 Zeichenaufrufe); jedes Glied ist eine eigene Entität.
- **Signale/Haken:** `level.onEnemyDefeated(e)` (je besiegtem Gegner, auch Schwarm-Fledermäuse), `level.onExplosion`,
  Boss: `level.onBossHit(boss, 'bombe')`, `level.onBossDefeated(boss)`. Aus Gimmicks erzeugbar: `level.spawn('kuerbling',
  { pos, vel: [vx, vy, vz], dir })`; die Süßigkeiten-Tür der Bausteine (`content: 'kuerbling'`) erzeugt ihn mit `fromDoor`
  – ohne `vel` hüpft er dann in Blickrichtung `dir` aus der Tür (2,2 m/s vor, 5,5 m/s hoch), landet und hüpft los
  (geprüft in `course_hw_blocks`: „Gegner heraus 1 (kuerbling)“); Hexenhut-Hüpfer ebenso.
- **Sound** nur über vorhandene `level.sfx`-Namen: `stomp`, `bounce`, `brickbreak` (Kürbling zerplatzt), `blockhit`
  (Knochen fallen), `step` (Klappern beim Zittern), `switch` (Aufbau), `vanish`, `hover` (Lunte), `swoop`, `land`, `slam`,
  `ghost` (Graf lacht), `panic` (Schwarm), `boss_hit`, `powerdown`; Fanfare `course_clear` über den Boss-Archetyp.

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| kuerbling | hüpft in Bögen auf die Figur zu (sight) bzw. auf seiner Bahn | Draufspringen (zerplatzt, Abprall, coins Bitcoins), alle Angriffe | seitlich |
| riesenkuerbling | wie Kürbling, ×1,8, nach Treffer 1 schneller | 2 Treffer → zerfällt in 3 kleine Kürblinge; Explosion/Stern/Riese ganz | seitlich |
| klapperknochen | läuft hin und her (bzw. verfolgt); Draufspringen → Knochenhaufen (harmlos, begehbar), zittert 0,8 s, steht nach 4 s wieder auf | **Stampfattacke auf den Haufen**, Feuer, Krallen, Panzer, Explosion, Stern, Riese | stehend seitlich |
| flatterfledi | hängt kopfüber, wacht auf, Sturzflug-Bogen durch die Figur, zurück; Kreis/Bahn/Schweben | Draufspringen, alle Angriffe | Berührung (auch im Sturzflug) |
| flatterfledi_schwarm | count Fledermäuse kreisen wippend um pos | je Fledermaus wie oben | Berührung |
| hexenhut_huepfer | hüpft unter der Krempe heran | **nur gelandet** von oben (platt); Feuer, Krallen, Panzer, Explosion, Stern, Riese immer | seitlich |
| kuerbis_bombe | liegt bzw. brennt; tragen, werfen, Aufprall explodiert | Stern/Riese entschärfen | Explosion (1,5 m) |
| graf_brummbaer | Boss H-Burg (siehe unten) | nur zurückgeworfene Kürbis-Bomben (3×) | stehend seitlich, Schwarm, Bomben |

### Präzisierung (Gegner Halloween): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Kürbling: behavior 'chase' (Standard ohne path) | 'patrol', sight 7, hop 1.1 (m je Hüpfer), height 0.5 (Sprunghöhe),
  //   pause 0.35 (s nach der Landung), coins 1 (Bitcoins beim Zerplatzen), path, loop, dir, wake, edges, drop,
  //   vel [vx, vy, vz] (startet im Flug), fromDoor (id | true: hüpft aus einer Süßigkeiten-Tür in Richtung dir)
  { kind: 'kuerbling', id: 'kb_jaeger', pos: [-11.5, 1, -14], sight: 7 },
  { kind: 'kuerbling', pos: [-14, 1, -19], behavior: 'patrol', path: [[-17, 1, -19], [-7, 1, -19]], sight: 0, coins: 2 },
  // Riesenkürbling (×1,8, hp 2): riese: true bzw. kind 'riesenkuerbling'; hop 1.4, height 0.7, pause 0.5, coins 2, kids 3
  { kind: 'kuerbling', id: 'kb_riese', riese: true, pos: [11.5, 1, -16], sight: 8 },
  // Klapperknochen: speed 1.2, behavior 'walk' | 'chase', sight 6, chaseSpeed 1.6, pile 4 (s bis zum Wiederaufbau, ab dem
  //   Umfallen), warn 0.8 (s Zittern davor), path, loop, dir, wake, edges, drop
  { kind: 'klapperknochen', pos: [-12, 1, -33], path: [[-17, 1, -33], [-7, 1, -33]] },
  { kind: 'klapperknochen', pos: [-11.5, 1, -39], behavior: 'chase', sight: 6, drop: 'coin' },
  // Flatterfledi: pos = Aufhängepunkt (hängt darunter); hang true, sight 5 (waagerecht), reach 7 (m tiefer), speed 6 (m/s im
  //   Sturzflug), cooldown 1.5, scale 1, drop; ohne Aufhängen: center + radius 2.5 (Kreis, y = Fußpunkt), flySpeed 2.2, cw,
  //   phase | path, loop | hang: false (schwebt an pos)
  { kind: 'flatterfledi', pos: [-9, 3.8, -55], sight: 5 },
  { kind: 'flatterfledi', center: [16, 1.7, -59.5], radius: 1.6, flySpeed: 1.8 },
  // Flatterfledi-Schwarm: pos = Mitte (y = Fußpunkt der Fledermäuse), count 6 (≤ 24), radius 2.5, speed 2 (m/s am Umfang),
  //   cw, phase, bob 0.35, scale 1, drop (je Fledermaus); Glieder: level.named `${id}_${i}`
  { kind: 'flatterfledi_schwarm', id: 'ff_schwarm', pos: [10.5, 1.9, -55], count: 6, radius: 2.6 },
  // Hexenhut-Hüpfer: behavior 'chase' | 'patrol', sight 7, hop 1.3, height 0.8, pause 0.55, bounce 14 (m/s Abprall von der
  //   Krempe), path, loop, dir, wake, edges, drop, vel, fromDoor
  { kind: 'hexenhut_huepfer', pos: [-11, 1, -74], sight: 7 },
  // Halloween-Spuke (Felder wie Welt 3) + halloween (Standard nach Welt), hat (Spuk)
  { kind: 'spuk', pos: [-9, 1.4, -98], size: 2.5, hat: 'hexe' },
  { kind: 'kreisgeist_kreis', pos: [13, 1.2, -97], count: 8, radius: 3 },
],
items: [
  // Kürbis-Bombe: lit false, fuse 3 (s), radius 1.5, carryFuse 1.6 (Mindest-Lunte nach dem Aufheben), vel (Flug; Lunte
  //   brennt erst ab der Landung), owner (trifft ihn nicht, bis eine Figur sie geworfen hat), id
  { kind: 'kuerbis_bombe', pos: [7, 1, -71] },
],
```

Laufzeit (für Tests und Gimmicks): Hüpfer `state` (idle | rest | crouch | air | land | hurt | burst | squashed | flipped),
`hops`, `hp`, `kids` (Riese), `brimBounces` (Hexenhut), `airborne`, `info()`; Klapperknochen `state` (idle | walk | collapse
| pile | shiver | rebuild | defeated), `lying`, `collapses`, `rebuilds`, `pileLeft`, `info()`; Flatterfledi `state` (hang |
wake | dive | return | fly | defeated), `mode` (hang | circle | path | hover | flock), `dives`, `anchor`, `diveFrom/diveLow/
diveTo`, `body()`, `info()`; Schwarm `angle`, `aliveCount`, `members`, `info()`; Kürbis-Bombe `state` (idle | lit | air |
carried | thrown | slide | explode | fizzle), `lit`, `fuse`, `exploded`, `fizzled`, `thrownBy`, `assisted`, `explosion`,
`info()`.

### Präzisierung (Gegner Halloween): Graf Brummbär

```js
{ kind: 'graf_brummbaer', id: 'graf', pos: [0, 2, -4] (Start, Fußpunkt), dir: [0, 1] (Start-Blick),
  arena: { center: [0, 2, 0], r: 9 }, hp: 3, speed: [1.3, 1.7, 2.1], keep: [3.6, 5.6], every: [2.8, 2.3, 2.0], first: 1.2,
  bombs: [1, 2, 2], max: [2, 3, 5], flight: [1.1, 1.0, 0.9], fuse: [3.4, 3.0, 2.6], radius: 1.5,
  ring: [0, 0, 4], ringEvery: 3, ringR: 2.8,
  swarm: [8, 8, 12], swarmLegs: [3, 3, 4], swarmSpeed: [3.6, 3.6, 4.4], swarmSpread: [1.3, 1.3, 1.7], swarmY: 0.95,
  star: { pos: [0, 2.4, 5], index: 0 }, wakeR: 10, drop, seed }
boss: { id: 'graf', name: 'Graf Brummbär', speed: 0, trigger, lock, warp: 'warp_sieg', warpPos, warpTo, frame: 0.45,
        center: [0, 2, 0], musicAfter: 'course_halloween_map' }
```

Ablauf: `wait` → `intro` (2,2 s, lacht) → `walk` (spaziert im Wunschabstand `keep` um die Figur, blickt sie an, bleibt
r − 1,2 m in der Arena) ⇄ `throw` (1,0 s; bei 50 % verlassen die Bomben die Tatze – `model.hand()`, einmal vermessen):
Phase 1 eine Bombe 1,3 m vor die Figur, Phase 2/3 zwei Bomben je 1,7 m links/rechts davon, Phase 3 jeder dritte Wurf ein
**kurzer Rundumwurf** (`ring` Bomben im Kreis `ringR` um ihn, 0,75 s Flug). Jede fliegende Bombe zeigt am Ziel eine **rote
Markierung** (`boss_marker`); gelandet brennt ihre Lunte `fuse` s. **Nur eine von der Figur zurückgeworfene Bombe, die ihn
in `walk`/`throw` trifft, zählt** (`onBombHit`) → `hit` (0,6 s, Zylinder fliegt; Lebensleiste, Ansage „Treffer!“) →
`stunned` (0,7 s, Schwindel-Fledermäuse) → `bats` (0,9 s: wickelt sich in den Umhang, verpufft) → `swarm`: `swarm`
Fledermäuse (Entitäten `graf_fledermaus`, eine Instanz-Gruppe) umkreisen den Anführer mit Zylinder (Modell
`fledermaus_schwarm`, unberührbar) in Hüfthöhe (`swarmY`) und fliegen `swarmLegs` Bögen über die Arena (jeder zweite
Bogen zur Figur hin, höchstens 0,65 · r von der Mitte; Bogenmitten ≤ 0,75 · r); **Berührung
verletzt, Draufspringen auf eine Fledermaus besiegt sie und gibt einen Bitcoin**. Die Landestelle ist der Ringpunkt
(0,5 · r) am weitesten weg von der Figur → `land` (0,9 s: übrige Fledermäuse fliegen zurück, Verwandlung rückwärts) →
`walk` (nächste Phase). 3. Treffer → `defeated` (2,4 s: setzt sich, Fledermäuse flattern davon, **Konfetti aus
Süßigkeiten** `bonbon_konfetti`, übrige Bomben verpuffen, Fanfare über den Archetyp) → `gone` (Stern, Archetyp: Warp-Box).
Kopfsprung/Stampfen = Abprall ohne Schaden; Feuer, Krallen, Panzer, Stern, Riese, Explosionen daneben zählen nicht.
Ansagen (ersetzen die Standardtexte): „Graf Brummbär!“ (Archetyp), „Wirf die Kürbis-Bomben zurück!“, „Ein
Fledermaus-Schwarm – ausweichen!“, „Jetzt fliegen mehr Bomben!“, „Vorsicht – Rundumwurf!“, „Graf Brummbär ist besiegt!“.
Tod im Kampf (`reset`): Graf 3/3 am Startplatz, Bomben, Markierungen, Schwarm, Konfetti weg, Kampf beim nächsten Betreten
von vorn. Schnittstelle wie Kippquader-König: `begin, reset, state, stateT, hp, maxHp, phase, visible, home` (= Arenamitte
für die Kampfkamera), `half, carHits 0, vulnerable, info()`. Laufzeit: `throws, bombsThrown, bombs, hits, hitLog, misses,
bounces, swarms, batsDown, bats, hidden, swarmPath()`.

### Präzisierung (Gegner Halloween): Hinweise für Level-Bauer

- **Bestand je Level** (Halloween-Level-Liste): H-1 Kürbisfeld `kuerbling` (Verfolger und Streifen, ein
  `riesenkuerbling`), `flatterfledi` an Bäumen; H-2 Dorf `kuerbling` mit `vel` aus den Süßigkeiten-Türen (Gimmick ruft
  `level.spawn`), `hexenhut_huepfer`, `flatterfledi_schwarm`; H-3 Nebelfriedhof `klapperknochen`, `kreisgeist` /
  `kreisgeist_kreis` (Halloween-Optik automatisch), `spuk`, hängende `flatterfledi`; H-4 Hexenturm `hexenhut_huepfer`
  (Krempen-Abprall zu höheren Plattformen), `flatterfledi` (Kreis/Bahn um den Turm), `spuk` mit `hat: 'hexe'`;
  H-Burg Parcours `kuerbling`, `klapperknochen`, Großspuk (`spuk`, `size: 2.5`), `kuerbis_bombe` (Wurfziele, Ziegel),
  Boss `graf_brummbaer`. Alle Arten liegen in `0-21` bereit (0-22: Boss).
- Hängende Flatterfledis höchstens ≈ 3 m über dem Weg aufhängen (`pos.y` = Ast/Decke): höher sieht die Kurs-Kamera
  (Neigung 45°) sie kaum. Unter ihnen sollte Platz für den Sturzflug-Bogen sein (er reicht `|Figur − Start|` m weiter).
- Klapperknochen auf Flächen ohne Abgrund daneben (er fällt sonst mit den Knochen hinunter und gilt als besiegt).
- Hexenhut-Hüpfer vor einer Stufe, die nur mit dem Krempen-Abprall (Scheitel ≈ 3,5 m) erreichbar ist, belohnt Timing.
- Riesenkürbling braucht ≈ 3 m Platz ringsum (die drei Kleinen fliegen 1–1,5 m weit).
- Kürbis-Bomben als Werkzeug: neben Ziegel/`lila_ziegelwand`/Gegnergruppen legen; `fuse` lang genug zum Tragen.
- H-Burg-Arena: runde Fläche r ≥ 9 m mit Brüstung (Bomben explodieren an Wänden), Eingang mit `boss.lock`,
  `arena.center` = Mitte des Daches, Stern vorn (`star`), Warp-Box `hidden` in der Mitte; die Musik `course_brummula`.
  Eigene Arena-Geometrie im Haken `LEVEL.build(level)` anlegen (vor dem Verschmelzen und vor den Level-Grenzen – sonst
  zählt sie nicht zu `bounds`/`killY`), Beispiel `0-22`. Thema `castle_night`: dessen Kulissen-Fledermäuse fliegen
  6–18 m über den Level-Grenzen und kreuzen bei der hohen Kampfkamera (19 m, 50°) groß das Bild – `0-22` hebt sie in
  `setup` um 14 m an (`level.view.sky.bats.bats[i].cy`); Wunsch an den Motor: Höhe der Kulissen-Fledermäuse an der
  Kamera ausrichten.

### Präzisierung (Gegner Halloween): Tests und Kennzahlen

`tests/course_hw_enemies.mjs` (Port 4540, `?course=0-21|0-22&scale=2&adapt=0`, deterministisch über `step(n)`
(1 Schritt = 1/120 s) und `setInput`; Hilfen `window.__t`: `Z(r, dz)`, `place`, `stomp`, `touch`, `fresh`, `hold`,
`action`, `face`, `coins`, Boss: `enter`, `untilSafe`, `throwBack`; `HWE_PART=1|2|3|4`, je Teil 2–4 min): Laden (alle Arten,
Halloween-Modelle ohne Platzhalter, Spuke in Halloween-Optik, Schwarm als Instanz-Gruppe, 10 s ohne Fehler) · Teil 1
Kürbling (Hüpf-Bögen heran, seitlich verletzt, Draufspringen zerplatzt + 1 Bitcoin, Streife auf der Bahn), Riesenkürbling
(2 Treffer → 3 Kleine im Flug, die danach hüpfen, 2 Bitcoins; Explosion ganz), Klapperknochen (Streife, Haufen harmlos und
begehbar, Zittern ab 3,2 s, Aufbau ab 4,0 s, Stampfattacke auf den Stehenden nur Haufen, auf den Haufen besiegt, Sprung auf
den Haufen nicht, Feuerball besiegt) · Teil 2 Flatterfledi (schläft, `wake>dive>return>hang`, Bogen genau durch die Figur,
trifft, Kreis, Draufspringen), Schwarm (kreist, einzeln besiegbar), Hexenhut (Krempe: 14 m/s, Scheitel 3,5 m, gelandet
platt), Kürbis-Bombe (aufheben, tragen, werfen, Aufprall, Lunte 3,0 s, Kette, Ziegel, Stern entschärft, Klapperknochen),
Spuke · Teil 3 Graf Brummbär vollständig (Auftritt, Würfe mit Markierung 1,4 m vor der Figur, Abstand, Kopfsprung,
Angriffe zählen nicht, Treffer nur mit zurückgeworfener Bombe, Verwandlung, Fledermaus-Bitcoin, Schwarm verletzt, Landung
≥ 5 m von der Figur, Phase 2 zwei Bomben, Schwarm 12, Phase 3 Rundumwurf r 2,8 m, Konfetti, Stern, Warp → Ziel, Tod setzt
zurück) · Teil 4 Bilder `tests/out/hwe_*.png` und Zeichenaufrufe. Gemessen (scale 2, inkl. Schattenpass): Gruselwerkstatt
35–83 Zeichenaufrufe (≤ 206 k Dreiecke, Thema pumpkin), Schlossdach 37–77 (≤ 163 k, Thema castle_night).
Regressionen: `course_enemies`, `course_w5_enemies` (Teile 1–3), `course_physics` bestanden; `course_hw_blocks`
(Teil mech) mit dem Kürbling aus der Tür bestanden.

## Präzisierung (Level H-1 und H-2)

Additiv zur Halloween-Level-Liste: Titel und Besonderheiten der beiden ersten Level der Kürbisinsel. Dateien
`src/course/levels/w31/H-1.js`, `H-2.js` (`LEVEL.world = 31`, Ids mit Präfix H), eigene Hilfen
`src/course/levels/w31/_helpers_a.js` (kein `LEVEL`, nur für diese beiden Level), Test `tests/course_hwa.mjs`. Kein
Motor-Code geändert; alle Sonderteile sind level-lokal (Hilfsdatei, Haken `LEVEL.build`). Kindgerecht: breite Wege, Stürze
in Bach, Mais, Teich oder Gasse sind ungefährlich; nur die Kürbisschlucht in H-1 (Kanonenflug) und der Rand des Hinterhofs
sind tief.

### H-1 „Kullerkürbisse im Abendrot“ (parcours · pumpkin · course_pumpkin · 400 s)

- Abschnitte (nach −Z, ≈ 270 m): **Hof** (Hoftor mit Kürbislaternen, rote Scheune, Vogelscheuche, Krähen auf dem Zaun,
  Winke-Kürbis) → **Kürbisbach** (über drei riesige Kürbisse hüpfen, Hineinfallen = schwimmen, Rampen hinaus) →
  **Kullerhang** (Lernen: Riesenkürbisse rollen quer übers Feld in Strohballen · Steigern: Hohlweg hinauf, ein Verschlag stößt
  Riesenkürbisse aus, die auf einer Zickzack-Bahn `path` herabkullern; Nischen am Rand bleiben frei) → **Scheunen-Plateau**
  (Checkpoint, Riesenkürbling) → **Laternenpfad** (Damm durchs Maisfeld mit drei Lücken; die Laternen gehen an, sobald man
  vorbeikommt; Mais in Reihen auf Ackerfurchen) → **Kürbis-Kanone** über die Kürbisschlucht (Bitcoins und Süßes im Flug) →
  **Vogelscheuchen-Feld** (Checkpoint 2, Kürbisse rollen von beiden Seiten, Kürblinge, Hexenhut-Hüpfer – Kombinieren) →
  **Zielhügel**.
- Sterne: 0 Winke-Kürbis (winkt zurück, sobald man näher als 10 m ist, „Stampf mal auf mich!“) – Stampfattacke auf ihn,
  Draufspringen allein nicht · 1 versteckter Laternenweg vom Damm in den Mais: Krümel hat sich mit seiner Laterne verlaufen
  („Huhu? Ich hab mich verlaufen!“), wer ihn erreicht, bekommt den Stern · 2 gelbe Kürbis-Kanone im Mais rechts → Galerie der
  Windmühle (7,5 m über dem Boden; Rückwärtssalto reicht nicht). Stempel: Lach-Grabstein-Schalter auf dem Damm schaltet zwei
  Laternen im Teich 12 s an, nur dann tragen drei Geisterplatten (`light: 'pfahl'`) zur Stempel-Insel (mit Extraleben).
- Extraleben: unsichtbarer Block an der Scheune, 1-up auf der Stempel-Insel. Gegner: Kürbling 8 + Riesenkürbling 1,
  Flatterfledi 2 (kreisen in Kopfhöhe), Hexenhut-Hüpfer 2; Riesenkürbisse aus drei Spendern.

### H-2 „Klingelstreich im Schlummerdorf“ (parcours offen · candyvillage · course_candyvillage · 400 s)

- Abschnitte (≈ 230 m, Bodenhöhen 1 → 2 → 3): **Dorfeingang** (Kürbistor, erste Tür mit Schild „Klingeln: vor die Tür
  stellen!“) → **Marktplatz** (sechs Türen der Gruppe `markt` mit HUD „Türen n/6“, Kessel-Brunnen in der Mitte, vier
  Marktstände mit federnden Markisen und Süßigkeiten-Säulen, Flatterfledi-Schwarm) → **Schiefe Gasse** (steigt über zwei
  Rampen, Türen auf beiden Seiten, Hexenhut-Hüpfer; ein Durchgang rechts führt in den Hinterhof) → **Brunnenplatz**
  (Checkpoint) → **Kirchplatz** (Kirchlein mit Glockenturm, Kirchhof mit Lach-Grabsteinen und kicherndem Geist; Stadtmauer mit
  verschlossenem Tor – über die federnden Markisen davor auf die Mauer, Treppe hinab) → **Kürbisfest** (Festplatz mit Bühne,
  Marktständen, Strohballen, zwei Türen, Kürbis-Turm, Zielmast auf der Bühne).
- 13 Süßigkeiten-Türen (Inhalt Bitcoins, Süßes oder ein Kürbling, der aus der Tür hüpft); klingeln durch Hinlaufen, Antippen
  bzw. Aktionstaste oder Stampfen auf die Matte. Nur die sechs Markt-Türen zählen im HUD (`group: 'markt'`), die übrigen
  laufen in Gruppen ohne Anzeige (`hud: false`).
- Sterne: 0 alle sechs Markt-Türen klingeln → Stern erscheint hoch über dem Kessel-Brunnen, mit dem Hexenkessel hinauf · 1
  Hinterhof hinter der Gasse („Psst!“): die rosa Tür gibt den Stern (`content: { star: 1 }`) · 2 einer der Grabsteine im
  Kirchhof ist ein Schalter → fünf Steinstufen erscheinen und führen zur Glockenstube (13 m). Stempel: Spinnennetz-Trampolin
  am Festplatz → oben auf den Kürbis-Turm (vier gestapelte Riesenkürbisse, 8 m; Kollision eine glatte Säule).
- Extraleben: unsichtbarer Block im Hinterhof. Gegner: Kürbling 4 (+ 4 aus Türen), Hexenhut-Hüpfer 3,
  Flatterfledi-Schwarm (5) über dem Marktplatz, Flatterfledi an der Stadtmauer.

### Hilfen (`_helpers_a.js`) und Hinweise

- Daten: `isl`, `line`/`arc`/`ring` (Bitcoins), `candy`/`candyRing`/`candyArc` (Süßigkeiten), `sign`. Kulisse sparsam als
  eigene Geometrie (statt der teuren Registry-Einzelmodelle für viele Stücke): `kuerbisDeko`/`kuerbisStreu` (≈ 250 statt
  2,5–5,7 k Dreiecke je Kürbis), `maisStreu` (Maisreihen in 16-m-Stücken, Schatten nur nahe am Weg), `ackerFurchen` (an den
  16-m-Grenzen geteilt, damit die 32-m-Abschnitte eng bleiben), `haeuschen` (≈ 270 Dreiecke), `laternenPfad` (Laternen gehen
  beim Vorbeilaufen an bzw. `allOn`; Gläser eine Instanz-Gruppe, Scheine ein Punkt-Mesh, Licht über `lanternSpots`).
  Bauwerke: `scheune` (Dach begehbar), `windmuehle` (Galerie begehbar, Flügel drehen), `hoftor`, `marktstand` (Markise
  `bounce`), `stadtmauer` (Zinnen, Tor, Lücke hinten), `kirchlein` (Glockenstube, rutschiges Schiffsdach, Abstand zum Turm),
  `brunnen`. Belebt: `winkeKuerbisse`, `kruemelLaterne`, `kicherGeist`, `kraehen`, `rampe` (Rampe mit `camIgnore`),
  `ohneSonnenschatten` (Riesenkürbisse werfen nur den Schatten-Blob).
- **Kamera und Rampen:** Die Kamera prüft Formen als Quader. Läuft die Figur eine lange Rampe (Baustein `ramp`) hinauf, liegt
  der Rampenquader hinter ihr im Kamerastrahl und die Kamera rückt bis auf 3 m heran – lange Rampen daher mit `camIgnore`
  (Hilfe `rampe`). Ein ?-Block direkt hinter/über der Figur zieht die Kamera ebenso heran.
- **Leistung:** Registry-Modelle wie Vogelscheuche (≈ 9,4 k), Riesenkürbis (≈ 12,7 k), Kürbling (≈ 11 k), Tür (≈ 10,6 k),
  Kürbislaterne (≈ 4,8 k) sparsam einsetzen; lange statische Teile (Beete, Inseln) an den 32-m-Grenzen teilen, sonst zählt
  ein großer Abschnitt auch von dahinter mit.
- Markisen als Weg auf eine Mauer: Stand dicht (≤ 0,4 m) vor die Mauer stellen, `bounce` 16,5 – sonst reicht der Bogen nicht
  über die Zinnen.

### Test `tests/course_hwa.mjs`

Port 4570 (+ `PORT_BASE`), Aufruf `node tests/course_hwa.mjs [H-1|H-2]`, Teilläufe `PARTS=load,route,sweep,targets,extra,
shotsA,shotsB` (jeder Teil getrennt unter 10 min), `HEROES=lotti,greta`, `ONLY=<Text>`, `SHOTS='a|b'`, `DETAIL=1`, Bilder
`tests/out/hwa_*.png`. Geprüft: Laden ohne Konsolenfehler, Meta (Welt 31), Gegnerzahlen, 10 s Simulation; Routen-Bot Lotti
und Greta Start → Ziel mit echter Mechanik (H-1: drei Bach-Kürbisse, acht Laternen gehen an, Kanonenflug; H-2: Tür klingeln,
Markise auf die Stadtmauer); alle Sterne und Stempel samt Gegenproben (Sprung statt Stampfen, fünf statt sechs Türen,
Rückwärtssalto statt Kanone/Schalter/Netz, Geisterplatten ohne Grabstein); Extras (Riesenkürbis trifft, Extraleben,
Riesenkürbling → drei kleine, Checkpoint 2, Tür-Bitcoins, Kürbling aus der Tür, Markisen-Säule, kichernder Geist); Messgang
entlang der Route. Die Verkleidung prüft der Routen-Bot über `outfit` von Szene und Avatar ('halloween'), sobald der Motor
sie kennt (wie `course_hwc`). Gemessen
(scale 2, inkl. Schattenpass): H-1 bis ≈ 88 Zeichenaufrufe / ≈ 290 k Dreiecke (Kullerhang, Kanone), H-2 bis ≈ 85 /
≈ 245 k (Marktplatz, Stadtmauer).

## Präzisierung (Level H-4 und H-Burg)

Additiv zur Halloween-Level-Liste: Titel und Besonderheiten der letzten beiden Level der Kürbisinsel. Dateien
`src/course/levels/w31/H-4.js`, `H-Burg.js`, eigene Hilfen `src/course/levels/w31/_helpers_c.js` (kein `LEVEL`, nur für diese
zwei Level), Test `tests/course_hwc.mjs`. **Kein Motor-Code geändert**; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.build`/`LEVEL.setup`, `level.onStep`, `view.onFrame`). Benutzte Bausteine/Gegner unverändert: `besen_plattform`,
`hexenkessel` (+ `potions`), `spinnennetz_trampolin`, `grabstein_schalter` (`press: 'pound'`, `time`), `appear`,
`geisterplattform` + `laternenpfahl` (`light: 'pfahl'`, `blink`), `nebel`, `deco_hw`, `lila_ziegel(wand)`, `kuerbis_bombe`,
`hexenhut_huepfer`, `flatterfledi`, `spuk` (`hat: 'hexe'`, Großspuk), `kreisgeist_kreis`, `kuerbling`, `klapperknochen`,
`graf_brummbaer`.

### H-4 „Hokuspokus-Hochhaus“ (parcours vertikal · witchtower · course_witchtower · 400 s)

- Nacht zwischen lila Wolken; von Turm zu Turm hinauf (y 0 → 30,6, ≈ 190 m nach −Z) bis auf die begehbare Krempe des
  Riesen-Hexenhuts, der das Dach des Hauptturms bildet (Zielmast). Abschnitte: **Kräutergarten** (Start, Beete, Trittsteine,
  winkender Kürbis, erster Kessel zum Lernen) → **Besenflug** (Besen 1 waagerecht, Türmchen mit kreisender Flatterfledi,
  Besen 2 steigt) → **Bücherturm** → **Kesselküche** (Tische, Regale, Kräuterbalken mit hängender Flatterfledi, Spuk mit
  Hexenhut; Kessel-Hopser auf den Balkon, Checkpoint) → **Besenwirbel** (Besen 3 fliegt selbständig einen Bogen – Timing;
  Spinnenturm, Netz auf die Glockenterrasse mit Checkpoint 2) → **Hutkrempe** (oranger Kessel, Besen 4, Brücke zur Krempe).
- Alle Besen außer Besen 3 starten erst, wenn man draufsteht (`start: 'stand'`, 1,6 s Pause an den Enden), Turmränder haben
  Brüstungen mit Lücken an Besen und Brücken. Kessel `jump` 6 / 8,2 / 8 m, Netze 5,6 / 7,4 / 11 m (immer ≥ 1,5 m über der
  Zielkante).
- Sterne: 0 **Geheimbesen** links am Bücherturm (grüner Glitzer, Zuckermais in der Luft) → Wolkeninsel (17 m vom Turm:
  ohne Besen unerreichbar) · 1 **Zaubertrank-Blase** des lila Kessels in der Küchenecke (steigt 13 m) → Mondturm (y 24,6;
  vom Balkon 7,8 m zu hoch, Kessel allein reicht nicht) · 2 **zweites Spinnennetz** hinter dem Türmchen der Glockenterrasse
  (Sprung 11 m, Süßigkeiten-Leiter) → Stern hoch über dem Türmchen (y 34,8). **Stempel**: Besen-Aufzug am rechten
  Krempenrand (steigt senkrecht 4,8 m, wartet oben 2,2 s) → Schornstein (y 37,6; von der Krempe 7 m zu hoch).
- Extraleben: unsichtbarer Block über dem Spinnennetz am Start; Kiste auf der Wolkeninsel (Stampfattacke).
- Gegner: Hexenhut-Hüpfer 6, Flatterfledi 4 (drei kreisen um Türme, eine hängt am Kräuterbalken), Spuk mit Hexenhut 2.
  54 Süßigkeiten (`candyHud`), Bitcoin-Bögen entlang der Besenbahnen.
- Kulisse/Überraschungen: `turm` (runde Türme: Bruchstein, Moos, Kragsteine, Bogenfenster mit grünem Licht, Zauberkreis
  auf dem Boden, spitz in die Wolken auslaufender Sockel), `terrasse` (rechteckige Turm-Terrassen ebenso), `hexenHut`
  (lila Riesenhut mit orangem Band, Goldschnalle, Glüh-Sternchen und -Monden), `hexenKueche`, `kraeuterGarten`,
  `winkeKuerbis` (dreht sich zur Figur, hüpft und winkt mit dem Ranken-Ärmchen), `wimpel`, `kuerbisLaternen` (sparsame
  Kürbislaternen ≈ 0,4 k Dreiecke statt ≈ 4,8 k), `besenKatze` (schwarze Katze mit Hexenhütchen fliegt auf einem Besen
  Runden um den Turm).

### H-Burg „Gruselgala auf Schloss Schlotterstein“ (parcours + boss · castle_night · course_brummula · 400 s)

- Graf Brummbär lädt zur Gruselgala: roter Teppich über die Zugbrücke ins Schloss. Abschnitte: **Vorhof** (Lach-Grabsteine,
  Kürbiskutsche, Kürbislaternen auf Pfählen, zwei Kürblinge, Zugbrücke über den Nebelgraben, Torbogen mit Türmen) →
  **Ahnengalerie** (acht Gemälde der Familie Brummbär als Leinwand-Atlas in einem Zeichenaufruf: Ur-Opa mit Monokel, Oma
  Brumhilde mit Hexenhut, Baby Brummbärchen im Kürbis …; Kerzenleuchter, zwei Klapperknochen) mit der **Gruft** rechts →
  **Spukball-Saal** (Tanzboden mit Geisterreigen = `kreisgeist_kreis`, Großspuk mit Hexenhut, Bankett-Tafeln mit Torte und
  Süßigkeiten, zwei Kronleuchter, Checkpoint) → **Turmaufgang** (Treppe, Geisterbrücke, die nur ein blinkender
  Laternenpfahl zeigt – Lücke 13 m, ohne Licht nicht zu überspringen –, Treppe, Wehrgang mit Zinnen, Checkpoint vor dem
  Dach) → **Schlossdach** (Arena wie `0-22`, `schlossDach`, Mitte z −197, y 10) → Warp-Box → **Siegerbalkon** mit Krümel
  und Zielmast.
- Stimmung `innen` (Kerzenschein) in Galerie, Gruft und Saal (`stimmungen`, Bereich x −12,5 … 21, z −105 … −20,5), sonst
  die Vollmond-Grundstimmung. Kulissen-Fledermäuse des Themas im `setup` um 14 m angehoben (wie 0-22).
- Sterne: 0 **Gruft**: Grabstein-Schalter nur mit der Stampfattacke (Daraufspringen genügt nicht) → drei Steinstufen
  erscheinen für 12 s (`appear`) → Nische hoch oben (y 8,5; Rückwärtssalto/Dreisprung reichen nicht) · 1 **Bonbon-Tresor**:
  Hohlwürfel aus lila Ziegeln (3 × 3 × 3) mit dem Stern innen – nur eine Kürbis-Bombe vom Karren daneben öffnet ihn
  (Stampfen nicht); `bombenNachschub` legt alle 2 s eine neue Bombe auf den Karren, bis der Tresor offen ist · 2 **Graf
  Brummbär besiegt**: versteckter Stern `stern_graf` (LEVEL.stars[2], `hidden`) erscheint vorn auf dem Dach, sobald der Graf
  `gone` ist (der Graf selbst ohne `star`, damit `LEVEL.stars` drei Einträge hat). **Stempel**: Spinnennetz in der Saal-Ecke
  (Sprung 7,2 m) → großer Kronleuchter (begehbare Platte, y 8,6; vom Boden und von den Tafeln unerreichbar).
- Extraleben: unsichtbarer Block in der Ahnengalerie; ?-Blöcke mit Wachstumsbeere im Vorhof und vor dem Treppenaufgang.
- Gegner: Kürbling 5, Klapperknochen 4 (nur auf Flächen mit Wänden/Brüstungen), Großspuk 1, Kreisgeist-Kreis 1 (8 Geister),
  Graf Brummbär (Werte wie im Vertrag; Arena r 9, Sperre an der Lücke vorn, Kampfkamera wie 0-22). 39 Süßigkeiten, 36 Bitcoins
  frei im Level (Teppich-Spuren, Ring um den Geisterreigen).
- Überraschungen: `kicherGeist` (kleiner Halloween-Spuk lugt hinter dem Kreuz-Grabstein hervor, verschwindet kichernd, wenn
  man näher als 4,5 m kommt), `kruemelLaterne` (Krümel – mit Mini-Vampirumhang, sobald die Verkleidung im Motor ist –
  schwenkt am Siegerbalkon die Laterne, jubelt und sagt „Juhu! Was für eine Gruselgala!“), `kuerbisKutsche`, `bankett`,
  `tanzboden`, `kronleuchter`, `teppich`, `zinnenMauer`, `torbogen`, `ahnenGalerie`, `terrasse` (Gruftnische).

### Test `tests/course_hwc.mjs`

Port 4590 (+ `PORT_BASE`), Aufruf `node tests/course_hwc.mjs [H-4|H-Burg]`, Teilläufe `PARTS=load,route,sweep,targets,extra,shots`
(empfohlen je Level zwei Läufe: `load,route,sweep` ≈ 3 / 4,5 min und `load,targets,extra,shots` ≈ 5 / 7 min), `HEROES`,
`ONLY`, `VERBOSE`, `SHOTS`, `DETAIL`; Bilder `tests/out/hwc_*.png`. Bot mit echter Eingabe (`setInput`/`step`), Beine u. a.
`broom` (Besen abwarten, aufsteigen, mitfliegen, absteigen/abspringen), `bounce` (Kessel/Netz, `center` für Kopfstöße),
`bubble` (Zaubertrank-Blase besteigen und oben hinüber), `lightOn` (Laternenpfahl frisch an), `bomb` (Kürbis-Bombe
aufheben, tragen, werfen), `boss` (gelandete Bomben des Grafen aufheben und auf ihn zurückwerfen, Schwarm abwarten).
Geprüft: Laden ohne Konsolenfehler, Metadaten (Welt 31), Gegnerzahlen, Verkleidung der Heldinnen (sobald der Motor sie
kennt), Routen-Bot Lotti und Greta Start → Ziel (H-4 ≈ 53 s mit 4 Besen und 4 Federn; H-Burg ≈ 64–75 s mit Bosskampf
≈ 33–36 s, 3 Treffer, 4–6 Würfe), alle Sterne und Stempel samt Gegenproben (Stern 0 nicht ohne Besen, Stern 1 nicht mit dem
Kessel allein, Stern 2 nicht ohne Netz, Stempel nicht ohne Besen; Gruft nicht ohne Stampfen, Tresor nicht durch Stampfen,
Kronleuchter nicht ohne Netz), Extras (winkender Kürbis, Extraleben, Besen wartet, Checkpoints auf Balkon und Glockenterrasse, kichernder
Geist, Bomben-Nachschub, Geisterbrücke nur bei Licht, Krümel jubelt, Tod im Kampf → Neustart vor dem Dach, Graf 3/3).
Gemessen (scale 2, inkl. Schattenpass): H-4 Messgang ≤ 90 Zeichenaufrufe / ≤ 240 k Dreiecke, Bilder 35–89 / ≤ 240 k;
H-Burg Messgang ≤ 78 / ≤ 245 k, Bilder 41–84 / ≤ 243 k (Start 220 k nach dem Wechsel auf sparsame Kürbislaternen).

Hinweis an den Modell-Agenten: `hexenturm` (`towerBody`) liefert NaN-Positionen bei Höhen, deren Hälfte nicht exakt
darstellbar ist (z. B. 3,2 oder 4,2: `Math.pow(y / H, 1.6)` mit y = −ε am Fuß) – die Level nutzen Höhen 3 und 4. **Behoben** (Hauptsitzung): `leanAt` klemmt y/H auf ≥ 0, alle Höhen sind jetzt erlaubt.

## Präzisierung (Level H-Kapitän und H-3)

Additiv zur Halloween-Liste: Titel und Besonderheiten zweier Level der Kürbisinsel. Dateien
`src/course/levels/w31/H-Kapitän.js`, `H-3.js`, eigene Hilfen `src/course/levels/w31/_helpers_b.js` (kein `LEVEL`, nur für
diese beiden Level), Test `tests/course_hwb.mjs`. Kein Motor-Code geändert; Sonderteile sind level-lokal (Haken
`LEVEL.build`/`LEVEL.setup`), die Mechanik kommt aus den Halloween-Bausteinen und -Gegnern. Einzige Baustein-Ergänzung
(additiv, `blocks/hwkit.js` + `blocks/types/hw_light.js`): die Lichtmaske im Geister-Shader beachtet jetzt `light` – eine
Platte mit `light: 'pfahl'` leuchtet im Licht der Handlaterne nicht mehr auf (vorher sichtbar, aber nicht begehbar: eine
Falle für Kinder), eine `'laterne'`-Platte nicht im Pfahl-Licht; `'alle'` unverändert (`ghostBatch.add(geo, mask)`,
Attribut `aMask`, Uniform `uK`). `course_hw_blocks` (Teil mech) bestanden.

### H-Kapitän „Krümel im Kürbis-Kuddelmuddel“ (diorama · pumpkin_night · course_diorama · 400 s, 3 Sterne)

- Kürbisfeld-Diorama bei Nacht (≈ 37 × 35 m mit Inseln): Kürbisstand-Insel (Start) → lila Geistersteg → Kürbisfeld mit
  **Strohballen-Labyrinth** (5 × 5 Zellen à 2,6 m, Wände 1 m, `mazeWalls`/`strawWalls`) → Rampe → Terrasse (y 2,5) mit
  **Riesenkürbis**, roter Scheune und blinkendem Laternenpfahl → **Vogelscheuchen-Insel**. Krümel (`figure: 'kruemel'`)
  trägt von Anfang an die Laterne (`LEVEL.lantern: { carry: true, radius: 4.6 }`).
- Sterne: 1 **Herz des Labyrinths** (richtiger Weg außen herum; Sackgassen mit Süßem, ein **Kürbis winkt zurück**,
  `wavingPumpkin`) · 2 **Geistertreppe** um den Riesenkürbis (12 grüne Geisterplatten, Stufen 0,25 m – Krümel springt
  nicht; nur im Laternenlicht) auf seinen Deckel, ein Kreisgeist kreuzt die Treppe · 3 **Pfahl-Brücke** (`light: 'pfahl'`,
  blinkt [4,5 s an, 3 s aus]; die Handlaterne zeigt sie nicht) zur Insel. Der dritte gefundene Stern beendet das Level.
- Gegner: Kürbling (2, Streife), Kreisgeist (1). Schatzstellen: Sackgasse, Kürbisbeet, Insel. Schilder „Kürbis-
  Kuddelmuddel“, „Warte, bis die Laterne brennt!“.

### H-3 „Gekicher auf dem Nebelfriedhof“ (parcours · graveyard · course_graveyard · 400 s)

- Abschnitte (≈ 225 m, Plateaus y 1): **Friedhofstor** (Laterne liegt im Weg, Klapperknochen zum Üben, Nebelgraben mit
  dem ersten lila Geistersteg – Hineinfallen harmlos) → **Nebelschlucht** (sieben lila Geisterplatten im Zickzack, Grabinsel
  mit Kreisgeist und Flatterfledi) → **Glibberbach** (Checkpoint; Floß mit Pflaume, Ufer 5 m breit, **Gruft-Durchfahrt**
  `cryptPassage`: hohe Quadermauern über beiden Ufern – zu Fuß kein Weg; Krümel winkt mit Laterne vom Ufer) →
  **Gruftgarten** (Checkpoint; blinkender Laternenpfahl auf einer Felsnadel zeigt die blaue Brücke; Klappergarten;
  Kreisgeist-Ring um die Gruft; Spuk; **Grabstein-Schalter** zündet dauerhaft den Pfahl der nächsten Brücke) →
  **Kapellenhügel** (Checkpoint, Treppe, Klapperknochen, Kreisgeist, Zielmast vor der Kapelle, Glockenturm).
- Sterne: 0 der **kichernde Geist** (`gigglingGhost`, „Hihi!“) huscht hinter den großen Grabstein – dahinter führen
  unsichtbare Geisterstufen (Laterne) auf die schwebende Gruft · 1 über dem Glibberbach hinter der Durchfahrt: nur mit
  einem **Floß-Hüpfer** erreichbar · 2 **Klappergarten**: drei Klapperknochen endgültig besiegen (Draufspringen →
  Knochenhaufen, Stampfattacke auf den Haufen), `task` mit `ids` zeigt den Stern. Stempel: **Glockenturm** – lila Stufen
  (Laterne) und blaue Stufen (nur wenn der Turm-Pfahl brennt, [3,6 s an, 2,4 s aus]) im Wechsel; auf lila warten.
- Gegner: Klapperknochen (8), Kreisgeist (2), Kreisgeist-Kreis (1 × 8), Spuk (1), Flatterfledi (3).
- Hinweise: Ufer des Glibberbachs mit `bank: 5` bilden die Friedhofsflächen (Kulisse muss 3,7 … 7,7 m von der Bachlinie
  liegen); die Gruft-Mauern decken die Ufer ganz ab (Oberkante y 8 – auch der Dreifachsprung reicht nicht).

### Test `tests/course_hwb.mjs`

Port 4580 (+ `PORT_BASE`), Aufruf `node tests/course_hwb.mjs [H-Kapitän|H-3]`, Teilläufe
`PARTS=load,route,targets,extra,sweep,shots` (je Lauf < 10 min; H-3-Bilder in zwei Hälften über `SHOTS='a|b'`),
`HEROES=lotti,greta`, `ONLY=<Text|Text>`, `VERBOSE=1`, `DETAIL=1`, Bilder `tests/out/hwb_*.png`. Bot mit echter Eingabe;
Beine u. a. `light`/`dark` (Laternenpfahl geht gerade an/aus), `clear` (Kreisgeist hinter dem Kürbis abwarten), `mount`/
`ride` (Floß auf dem Glibberbach, `jump` je z-Bereich, `untilZ`), `bones` (Klapperknochen anspringen, Haufen stampfen;
`noPound`), `pound`, `star`/`stamp`. Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; H-Kapitän: Krümel springt
nicht, alle drei Sterne einzeln und in einem Lauf (≈ 62 s) samt Gegenproben (ohne Laterne kein Steg, Pfahl aus → keine
Brücke), winkender Kürbis, Schatzstelle; H-3: Routen-Bot Lotti und Greta Start → Ziel (≈ 41 s), alle Sterne und Stempel mit
beiden Heldinnen samt Gegenproben (ohne Laterne keine Stufen, ohne Hüpfer kein Stern, nur Draufspringen → kein Stern,
blaue Stufe bei Pfahl aus trägt nicht), Nebelgraben harmlos, Glibber = Neustart am Checkpoint, Gruft-Mauer, Krümel winkt,
Grabstein-Schalter (Greta) samt Gegenprobe (ungedrückt keine Brücke); Messgang je Abschnitt. Verkleidung: geprüft über
`__course.outfit`/`rig.avatar.outfit`, sobald der Motor sie kennt (sonst Hinweis). Gemessen (scale 2, inkl. Schattenpass):
H-Kapitän 42–81 Zeichenaufrufe / ≤ 255 k Dreiecke (Überblick: ganzes Diorama im Bild) · H-3 Messgang je Abschnitt Ø 56–72,
max 89 Aufrufe / ≤ 229 k Dreiecke (Gruftgarten), Bilder 47–95 / ≤ 240 k (Floß in der Gruft-Durchfahrt am teuersten).

## Präzisierung (Figuren Halloween): Verkleidung

Additiv zur Halloween-Welt „Kürbisinsel“ (Abschnitt „Verkleidung“). Dateien: Schalter `src/three/lib/outfit.js`, Bausteine
`src/three/lib/heroHalloween.js`, Avatare `src/three/avatars/hero.js` (HeroAvatar, PflaumeAvatar), Hasenmodell
`src/course/models/kinds/props.js` (`bunny_small`, damit auch `kruemel`), `src/course/archetypes/KruemelRig.js`; Anbindung
`src/course/CourseScene.js`, `src/course/map/CourseMapScene.js`. Test `tests/outfit_hw.mjs`.

**Schalter (ein Wert für alle Figuren):** `setOutfit(kind, owner)` / `clearOutfit(owner)` / `currentOutfit()` aus
`three/lib/outfit.js`, `kind` = `'halloween'` | `null`.
- `CourseScene.create` setzt `outfitForLevel(id, LEVEL)`: `LEVEL.outfit` hat Vorrang (auch `null` = aus), sonst Level-Id mit
  Präfix `H-`, `LEVEL.world === 31`, `LEVEL.halloween: true` (wie die Halloween-Optik der Spuke) oder Halloween-Testlevel
  `0-20`/`0-21`/`0-22` → `'halloween'`; `window.__course.outfit`.
- `CourseMapScene.create` setzt `outfitForMap(MAP)`: `MAP.outfit` (auch `null`), sonst Welt 31 → `'halloween'`;
  `window.__courseMap.outfit`. Beide Szenen räumen beim Beenden auf (`clearOutfit` wirkt nur, wenn die Szene zuletzt gesetzt
  hat – Reihenfolge der Szenenwechsel egal).
- Alle Figuren lesen den Wert je Bild: HeroAvatar und PflaumeAvatar (Kurs und Klassik; damit auch Figurwechsel, Spiegelfrucht-
  Klone, Ritt/Floß, Diorama) und das Modell `bunny_small`/`kruemel` (`state.outfit` hat Vorrang). Einzelne Avatare:
  `avatar.setOutfit('halloween' | null)` (Vorrang vor der Szene), `avatar.setOutfit('auto')` folgt wieder der Szene.
- URL-Schalter zum Testen: `?outfit=halloween` erzwingt die Verkleidung überall, `?outfit=0` schaltet sie überall ab.
- Außerhalb der Halloween-Welt ist alles exakt wie bisher: Zubehör entsteht erst beim ersten Anziehen und hängt nur, solange
  es getragen wird, im Szenengraphen (Figur-Bündel und Schatten-Stellvertreter unverändert; gleiche Zeichenaufrufe/Dreiecke,
  auch nach An- und wieder Ausziehen – geprüft).

**Je Figur** (Figurenstil, Bausteine in `heroHalloween.js`):
- **Lotti:** kleiner, etwas schiefer Hexenhut – lila Krone mit weichen Knautschfalten und nach hinten umgeknickter Spitze,
  orangefarbenes Band, gelbe Pausback-Sternchen, gewellte, seitlich schmalere (ovale) Krempe (Platz für erhobene Arme:
  Trapez, Kanone, Tragen). Ihre rote Schleife sitzt hinten am Hutband (das Haar trägt dann keine), die Zöpfe hängen unter der
  Krempe hervor. Eigenes Mesh am Kopf in der Stoff-Oberfläche → Figur-Bündel und Schatten-Stellvertreter: 0 zusätzliche
  Zeichenaufrufe (+1 nur in den kurzen Stauch-Momenten, in denen die Figur ohnehin ungebündelt zeichnet).
- **Greta:** Katzenohren (schwarz, innen rosa) am pinken Haarreif im Haar-Mesh (0), drei aufgemalte Schnurrhaare je Wange und
  ein dunkles Katzen-Näschen als Kopf-Aufkleber (0), Katzenschwanz mit rosa Schleife: ein SkinnedMesh (acht Knochen = halbe
  Kettenglieder, Ecken abgerundet) an einer `HangChain` aus vier Gliedern hinten am Rock – steht als Fragezeichen nach oben
  (zur rechten Seite gekringelt), wedelt gemächlich, federt bei Sprung und Landung nach, weht beim Laufen und im Kanonenflug
  nach hinten; Wurzelkegel (nie nach vorn zwischen die Beine), Kugel-Kollider am Rock, im Wasser Auftrieb, Statue starr.
  Ohne Schattenwurf: +1 Zeichenaufruf.
- **Pflaume:** orange-schwarz gestreiftes Halstuch statt des einfarbigen (Geometrie-/Materialtausch am Halstuch-Mesh; mit Kraft
  `red`/`blue`/`yellow` Streifen in der Kraftfarbe – die Kraft bleibt erkennbar), Fledermausflügelchen (Armknochen, zwei Finger,
  gezackter Hinterrand, Krällchen; zwei Meshes im Fell-Material unter `body`, folgen der Rumpf-Neigung, nicht dessen Atem-
  Stauchung → gebündelt, 0 Aufrufe). Flügelschlag: Stand sacht mit Flatter-Schüben, Hoppeln/Galopp im Hoppel-Takt, Sprung/
  Jubel schnell, Stampfen hoch gestellt; mit Reiterin hoch hinter ihrem Rücken (Platz für die Beine).
- **Krümel:** Mini-Vampirumhang am hop-Gelenk von `bunny_small` – Stehkragen mit zwei Spitzen, außen nachtlila, innen rot
  (Vorderkanten klappen auf), Fledermaus-Saum mit Kerbe für das Puschelschwänzchen; wallt beim Hüpfen; ohne Schattenwurf
  (+1 Aufruf je Hasenmodell). `KruemelRig`: Kapitänsmütze bleibt, der Rucksack verschwindet unter dem Umhang (Aufrufe gleich).

**Posen und Power-ups:** alle Kurs-Posen tragen die Verkleidung (Lauf, Sprünge, Saltos, Trapez, Kanone, Klettern, Ranke,
Zaun, Wand, Gleiten, Schwimmen, Tauchen, Stampfen, Rutschen, Reiten, Jubel, Tod, klein). Krallen-Anzug (Kapuze, Ringelschweif)
und Gleitblatt (Blatt-Reif, Blatt-Schweif) ersetzen Kopfschmuck und Schwanz der Verkleidung (Lottis Schleife sitzt dann
wieder im Haar; Gretas Schnurrhaare bleiben). Funkenblüte: Verkleidung bleibt (Lottis Hut-Schleife feuerweiß, Gretas Ohren am
roten Reif). Funkelstern: der Regenbogen-Glanz erfasst das Zubehör (auch später angelegtes). Riesentrank, Statue (Stein-Haut),
Klone `lite` (ohne Schattenwurf): mit Verkleidung. Trage-Helm (HeroRig, fremdes Kind am Kopf): Hut bzw. Ohren ruhen darunter.

**Kennzahlen** (`tests/outfit_hw.mjs`, je Figur, Differenz sichtbar/unsichtbar inkl. Schattenpass; ohne → mit Verkleidung):
Lotti 9 → 9 Zeichenaufrufe, 28,6 k → 32,4 k Dreiecke (× 1,13) · Greta 9 → 10, 24,0 k → 26,0 k (× 1,09) · Pflaume 11 → 11,
16,4 k → 18,3 k (× 1,12) · Krümel (Modell) 10 → 11, 9,8 k → 10,9 k (× 1,11) · KruemelRig 8 → 8 · Ritt in 1-4 (Heldin + Pflaume)
17 → 17, 39,9 k → 44,9 k. Wieder ohne Verkleidung jeweils exakt wie vorher.

## Welt 6 – Level-Liste und Freischaltung (Hauptsitzung)

Welt 6 „Wolkeninseln“ (Himmel/Wolken, Wasser) wird nach Sieg über `5-Burg` frei (Glasröhre `W6` auf der
Welt-5-Karte, bisher „Welt 6 kommt bald!“). Sternbedarf zählt **alle** gesammelten Sterne (Welt 1–5: 140, dazu die
Halloween-Welt). 6-B ist wie im Bauplan ein Steinkreis gleich am Weltanfang.

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `6-1` | parcours (Bergland, verzweigtes Glasröhren-Netz, Stachelkugeln, 5 Schlüsselmünzen, Wolkenkanone in den Münzhimmel) | clearpipe | course_clearpipe | 3 + Stempel | Welt 6 offen |
| `6-B` | arena (Steinkreis: 1 Feuer-, 2 Hammer-, 2 Bumerang-Werfer, 100 s) | stonecircle | course_arena | 1 | Welt 6 offen |
| `6-2` | parcours (Geisterschiffe: kippende Schiffe, 1 m Kippsteg, Schubser, gefluteter Laderaum mit Kreisgeistern) | wreck | course_wreck | 3 + Stempel | 6-1 |
| `6-3` | parcours (Fernost-Halle: Schiebetüren antippen, Gong, Pilz-Maske – zugewandte Gegner sehen die Figur nicht) | fareast | course_fareast | 3 + Stempel | 6-2 **und ≥ 110 Sterne** |
| `6-4` | parcours (Dschungel: Floßfahrt im lila Giftsee, Brummer, Rankenschnapper, Klettergitter, Abwärtsströmung) | jungle | course_jungle | 3 + Stempel | 6-2 |
| `6-A` | arena (kleine Festung, 2 × 3 Glasröhren an den Wänden, Schubser-Prinz: in eine Röhre rammen, 3 Tritte) | fortress | course_arena | 1 | 6-4 |
| `6-5` | parcours (Schnee: Eisseen, Pustewolken, Windböen über Abgründen, Glotzfische, Schlittschuh) | snowwind | course_snowwind | 3 + Stempel | 6-4 |
| `6-6` | parcours vertikal (Maschinenhalle: Förderbänder auch an Wänden, Projektilkopf-Kanonen, Riesenprojektil, 500 s) | factory | course_factory | 3 + Stempel | 6-5 |
| `6-Haus` | house (5 Räume à 10 s, alles mit Wurfbällen) | house | course_house | 5 | 6-6 |
| `6-7` | autoscroller vertikal (Mine nach oben, Wuschel-Horde jagt von unten, Quetschblöcke, Wippen) | fuzzymine | course_fuzzymine | 3 + Stempel | 6-6 |
| `6-Panzer` | autoscroller + boss (zweite Panzerkolonne, Zündköpfe, große ?-Blöcke wachsen zu Türmen; Boss Wirbelbrocken mit Attrappen) | skyway (vorhandenes Himmelsthema, Wolkenstraße) | course_tank | 3 + Stempel | 6-7 |
| `6-C` | parcours + boss (Plattform mit Spiegelfrucht, Seilbahn, Zirkuszelt-Arena; Boss **Würfelblase**) | circus (vorhanden) | course_bossblob | 3 + Stempel | 6-Panzer **und ≥ 120 Sterne** |

Welt 6 hat 34 Sterne. Neu: Glasröhren-Netz mit Abzweigen, Stachelkugeln, Kippschiffe/Kippsteg, Schiebetüren (antippen),
Gong (Münzregen, Rätselbox), Pilz-Maske, Klettergitter, Pustewolken/Windböen, Förderbänder (Boden und Wand), Quetschblöcke,
Wippen (vorhanden prüfen), Wurfbälle (6-Haus). Gegner: Schubser, Pustewolke, Glotzfisch, Stachelwerfer, Hammer- und
Bumerang-Werfer (vorhanden prüfen), Wuschel-Horde; Bosse **Schubser-Prinz** (6-A) und **Würfelblase** (6-C: sammelt
Gelee-Brocken zu einem silbernen Riesen, springt mehrfach, trennt sich beim letzten Sprung und flieht – dann verwundbar;
3 Kopftreffer), Wirbelbrocken mit Attrappen (6-Panzer). Freischaltung der Halloween-Welt bleibt unberührt.

## Präzisierung (Motor und Bausteine Welt 6)

Ergänzung des Motor-/Bausteine-Agenten für Welt 6 „Wolkeninseln“ (Stand: Wolkenwerkstatt `0-23`). Nichts oben Festgelegtes
wird geändert; alles ist additiv. Alle Welt-6-Mechaniken sind parametrierbare Module, Level-Bauer setzen sie nur in Daten
ein; jede Datei dokumentiert ihre Felder vollständig im Kopfkommentar. Aktionen im bekannten Format (Präzisierung
Sonder-Bausteine; die Signal-Verben `reveal`/`hide`/`start`/`stop`/`toggle`/`open` rufen die gleichnamigen Methoden der
benannten Handles). Entitäts-Gimmicks sind auch als `type` in `segments` erlaubt (`w6_misc.js`), die Bausteine
`kippschiff`, `kippsteg`, `wippe`, `schiebetuer`, `gong`, `klettergitter`, `windfeld`, `foerderband`, `quetschblock`,
`wolkenplattform`, `floss` auch als `kind` (Hülle wie Welt 5). Richtungen im 90°-Raster; `yaw: −π/2` = Vorderseite zur
Kamera (+Z); Level verlaufen nach −Z.

### Präzisierung (Motor und Bausteine Welt 6): Dateien

```
src/course/blocks/w6kit.js               w6(level) Sammelstelle { winds, currents, rafts, tilts, crushers, belts, pipes,
                                         gongs, grids }, figures, shove (kollisionssicher schieben), pushFigures, windAt,
                                         TiltDeck (kippende Lauffläche aus Rampen-Streifen), beltTexture, rotXZ, flatColor,
                                         w6Sfx (Klang mit Ersatz)
src/course/blocks/types/w6_pipes.js      glasnetz (Glasröhren-Netz mit Kreuzungen, Weichen, Fenstern, Mitnahme)
src/course/blocks/types/w6_ship.js       kippschiff, kippsteg, wippe
src/course/blocks/types/w6_hall.js       schiebetuer, gong
src/course/blocks/types/w6_grid.js       klettergitter (Wand / Decke)
src/course/blocks/types/w6_wind.js       windfeld
src/course/blocks/types/w6_conveyor.js   foerderband (Boden / Wand / rund)
src/course/blocks/types/w6_crusher.js    quetschblock
src/course/blocks/types/w6_water.js      floss, stroemung
src/course/blocks/types/w6_cloud.js      wolkenplattform
src/course/blocks/types/w6_misc.js       Entitäts-Gimmicks als segments-type (auch Listen: balls / targets)
src/course/blocks/types/deco_w6.js       Kulisse Welt 6 (verschmolzen; Registry-Modelle gebacken)
src/course/entities/kinds/w6_gimmicks.js stachelkugel, stachelkugel_quelle, wurfball, zielscheibe, pilz_maske (+ helm_maske),
                                         riesenfrageblock + kind-Hüllen der Bausteine
src/course/player/hanging.js             Hangeln am Deckengitter (state 'hang')
src/course/view/theme_clearpipe|stonecircle|wreck|fareast|jungle|snowwind|factory|fuzzymine.js, backdrop_w6.js
src/course/levels/w0/0-23.js             Wolkenwerkstatt (eine Station je Mechanik, marks für den Test)
tests/course_w6_blocks.mjs               Port 4600, W6B_PART=mech|themes, Bilder tests/out/w6b_*.png
```

Additiv geändert (Motor, je wenige Zeilen, mit Kopfkommentar):
- `player/Player.js`: `hang`/`hangMove` (Deckengitter: Greifen im Sprung, Hangeln im Modus `'wall'`), Getter
  `player.masked` (= `helmet === 'maske'` und lebt), `info()` mit `hang`, `masked`.
- `level/Level.js`: `level.hangGrids` (Deckengitter), `level.isMaskedFrom(enemy, fig?, angleDeg = 75)`.
- `player/HeroRig.js`: neuer Wert `proxy.course.state = 'hang'` mit `proxy.course.hangMove = { x, y }` (Stick −1..1,
  x = rechts, y = vor) und `speed` (Hangeltempo); Ersatz-Pose `'trapeze'`, solange `avatar.courseStates?.has('hang')`
  nicht gilt (Figuren-Agent: Pose „hängt an beiden Händen, hangelt“ anbieten und `'hang'` in `courseStates` eintragen).
- `player/helmets.js`: von außen eingetragene Helme dürfen `def.model` (Registry-Name) und `def.fallbackModel(opts)` haben.
- `view/themes.js`: 8 Registrierzeilen (`??=`).

### Präzisierung (Motor und Bausteine Welt 6): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `glasnetz` | Netz aus benannten Knoten und (gebogenen) Röhren; Öffnung = Knoten mit einer Röhre; an Kreuzungen wählt der Stick (kamerabezogen), sonst Weiche bzw. geradeaus; Gegner/Gegenstände reisen mit | `radius` 1, `speed` 12, `exitSpeed` 7, `nodes` { name: [x,y,z] }, `pipes` [{ `from`, `to`, `via` [[x,y,z]…], `style` 'glas' \| 'metall', `color`, `windows` true \| [[s0,s1]…], `oneWay`, `speed`, `coins` }], `ends` { name: { `enter` true, `exitSpeed`, `cannon` { `target`, `arc` 6 } } }, `weichen` { K: { `to`, `toggle` [..], `signal`, `sign` true, `tap` true } }, `carry` true, `solid` true, `hidden`, `id` → `{ nodes, edges, rides, carried, switchOf(k), setSwitch(k,to), toggle(k?), ride(fig,k), info() }` | `{ type: 'glasnetz', id: 'netz', nodes: { A: [0,2.05,-9], K: [0,2.05,-17], B: [-9,2.05,-27], C: [9,2.05,-27] }, pipes: [{ from: 'A', to: 'K' }, { from: 'K', to: 'B', via: [[-4.5,2.05,-20]] }, { from: 'K', to: 'C', via: [[4.5,2.05,-20]], style: 'metall', windows: true }], weichen: { K: { to: 'C', toggle: ['B','C'], signal: 'weiche1' } } }` |
| `stachelkugel` (kind; auch type) | rollende Stachelkugel: verletzt immer (auch von oben), Bahn oder frei rollend; Stern/Riesentrank/Explosion/Quetschen zerstören sie | `pos` (Auflagepunkt), `size` 1.2, `path`, `speed` 3.5, `mode` 'loop' \| 'pingpong' \| 'once', `wait`, `phase`, `vel` [vx,vz] (frei), `friction` 0.4, `life` 0, `respawn` 0, `color` 'eisen' \| 'lila' \| 'rot', `id`, `hidden` | `{ type: 'stachelkugel', id: 'kugel1', pos: [-8,1,-47], path: [[-8,1,-47],[8,1,-47]], speed: 3, mode: 'pingpong' }` |
| `stachelkugel_quelle` (kind; auch type) | Röhrenmündung, aus der im Takt Kugeln rollen | `pos`, `dir` [dx,dz], `every` 3, `speed` 4, `size`, `max` 4, `life` 14, `phase`, `path`, `idle` → `{ spawned, start(), stop() }` | `{ type: 'stachelkugel_quelle', pos: [-12,1,-55], dir: [1,0], every: 3, max: 3, life: 7 }` |
| `kippschiff` | ganzes Schiff rollt um die Längsachse: Gewicht der Figuren (auch Klone) und schwerer Gegner + Welle; hangab rutscht alles; Reling | `pos` (Deckmitte), `length` 16, `width` 7, `yaw` 0 (Bug −Z), `maxTilt` 14, `weight` 2.2 (°/m), `wave` { `amp` 5, `period` 5, `phase` } \| false, `slide` 2.4, `response` 1.6, `back` 0.8, `rails` true, `hull` 2.4, `masts` 2, `sails` true, `lanterns` 2, `style` 'geist' \| 'holz', `thick` 0.6 | `{ type: 'kippschiff', id: 'schiff', pos: [0,1,-71.5], length: 14, width: 7, wave: { amp: 4, period: 5 } }` |
| `kippsteg` | 1-m-Steg rollt seitlich (Figur am Rand kippt ihn, Welle schaukelt) | `from`, `to` (Oberseite, achsenparallel), `width` 1, `thick` 0.3, `maxTilt` 22, `weight` 40, `wave` { `amp` 7, `period` 3.2 }, `slide` 3, `response` 2.4, `back` 1, `posts` true, `style` | `{ type: 'kippsteg', id: 'steg', from: [0,1,-78.6], to: [0,1,-89] }` |
| `wippe` | Brett auf Bock, Last am Hebel drückt die Seite hinab | `pos` (Drehpunkt = Mitte Oberseite), `length` 8, `width` 2.5, `yaw` 0 (entlang X; π/2 entlang Z), `maxTilt` 24, `weight` 9, `response` 2.2, `back` 0.6, `slide` 0, `thick` 0.4, `stand` true, `style` | `{ type: 'wippe', id: 'wippe', pos: [-4,1.4,-240], yaw: Math.PI / 2 }` |
| (Handle aller drei) | | `{ angle (°), target (°), load, deck (TiltDeck), push(deg), info(), tilter }` | |
| `schiebetuer` | Papier-Schiebetür: Antippen/Aktion in Reichweite (bzw. Nähe/Signal) öffnet; zu = versperrt; `behind: 'wand'` = Scheinwand | `pos` (Mitte Unterkante), `width` 2.4, `height` 3, `yaw` −π/2, `open` 'tap' \| 'near' \| 'signal', `near` 2.5, `slide` 'rechts' \| 'links' \| 'beide', `speed` 2.5, `close` 0, `behind` 'frei' \| 'wand', `onOpen`, `style`, `color`, `frame`, `reach` 3.5, `hint` true, `hidden` → `{ open(), close(), toggle(), state ('zu'\|'oeffnet'\|'auf'\|'schliesst'), k, opens, info() }` | `{ type: 'schiebetuer', id: 'tuer2', pos: [-10.6,1,-114], yaw: 0, behind: 'wand', slide: 'beide', onOpen: { coins: 3 } }` |
| `gong` | Antippen, Aktion, Stampfen auf die Platte davor, Treffer (Wurfball, Panzer, Feuer, Tatze) → Münzregen, Aktion, Signal | `pos` (Fußpunkt), `yaw` −π/2, `size` 1.8, `coins` 10, `rain` { `r` 5, `height` 9, `time` 1.6 }, `onHit`, `signal` 'gong' (false = keins), `once`, `cooldown` 1.2, `plate` true, `trigger` ['tap','pound','hit'], `reach` 3.5, `hidden` → `{ hits, ring(via), info() }` | `{ type: 'gong', id: 'gong', pos: [8,1,-120], onHit: { reveal: 'maske' } }` |
| `pilz_maske` (kind; auch type) | Trage-Helm `'maske'`: zugewandte Gegner sehen die Figur nicht; Treffer schlägt sie ab (liegt als `helm_maske` da); Ducken + Aktion setzt ab | `pos`, `respawn` 0, `id`, `hidden` | `{ kind: 'pilz_maske', id: 'maske', pos: [4,1,-117], hidden: true }` |
| `klettergitter` | Wand: klettern wie am Kettenzaun (state `'fence'`); Decke: im Sprung greifen und hangeln (state `'hang'`; Sprung/Ducken lässt los) | `mode` 'wand' \| 'decke'; Wand: `pos` (Mitte Unterkante), `size` [w,h] (3×4), `yaw` −π/2, `wall` true (feste Wand dahinter); Decke: `pos` (Gitterebene), `size` [w,d] (4×4), `ceiling` true; `cell` 0.5, `style` 'metall' \| 'bambus' \| 'liane' \| 'holz', `hidden` → `{ mode, climbers(), reveal(), hide(), info() }` | `{ type: 'klettergitter', id: 'decke', mode: 'decke', pos: [6,3.8,-154.5], size: [5,4], style: 'liane' }` |
| `windfeld` | Quader mit gerichtetem Wind: Böen mit Vorwarnung (Windlinien), Dauerwind oder Signal; Figuren (am Boden × `ground`), leichte Entitäten (`windK`) | `pos` (Mitte unten), `size` [8,6,6], `dir` [dx,dz] \| [dx,dy,dz], `strength` 7, `mode` 'boe' \| 'dauer' \| 'signal', `period` 4.5, `on` 1.8, `warn` 1.0, `phase`, `ramp` 0.25, `ground` 0.7, `items` true, `streaks` 36, `source` 'none' \| 'wolke' \| 'ventil', `fahne` [x,y,z] \| true (Windsack), `idle` → `{ state ('ruhe'\|'warn'\|'boe'), k, gusts, pushed, start(), stop(), toggle(), gust(), add(x,y,z,out), info() }` | `{ type: 'windfeld', id: 'wind', pos: [0,-2,-178.5], size: [26,8,7], dir: [1,0], strength: 6, period: 4, on: 1.6, source: 'wolke', fahne: [-8,0,-174.2] }` |
| `foerderband` | Boden (trägt mit), Wand (senkrechtes Band mit Mitnehmer-Stufen, kletterbar), rund (Band läuft um einen Block, Mitnehmer oben/vorn/unten/hinten) | Boden: `pos` (Mitte unten), `size` [3,0.5,8], `dir` [0,−1], `speed` 3, `style` 'gelb' \| 'grau' \| 'rot'; Wand: `mode` 'wand', `pos` (Unterkante der Bandfläche), `width` 3, `height` 10, `yaw` −π/2, `speed` 2 (+ aufwärts), `depth` 1, `ledges` 2.5, `ledge` 0.7, `climbable` true; rund: `mode` 'rund', `pos` (Block Mitte unten), `length` 8, `height` 3, `width` 3, `yaw` 0 (Oberseite läuft +X), `speed` 2.5, `ledges` 2, `ledge` 0.5; `idle` → `{ mode, speed, running, start(), stop(), toggle(), reverse(), info() }` | `{ type: 'foerderband', id: 'band1', pos: [-6,0,-199], size: [4,0.5,8], dir: [0,-1], speed: 3 }` |
| `quetschblock` | stößt im Takt (Vorwarnung: zittert, Augen glühen), schiebt Figuren/Gegner; **tödlich nur bei echtem Einklemmen** (`player.die('crush')`, Gegner `onHit('crush', handle)`); oben fährt man mit | `pos` (Mitte unten in Ruhe), `size` [2,2,2], `dir` 'down' \| 'up' \| '+x' \| '-x' \| '+z' \| '-z', `travel` 3, `out` 0.25, `hold` 0.6, `back` 1.1, `wait` 1.4, `warn` 0.7, `phase`, `mode` 'takt' \| 'nah' \| 'signal', `near` 4, `style` 'metall' \| 'stein' \| 'holz', `face`, `spikes`, `idle`, `onSlam` → `{ state ('ruhe'\|'warn'\|'stoss'\|'halt'\|'zurueck'), k, crushes, pushes, cycles, start(), stop(), fire(), box(), info() }` | `{ type: 'quetschblock', id: 'quetsch1', pos: [-6,3.2,-228], dir: 'down', travel: 3.2 }` |
| `floss` | Floß legt ab, sobald eine Figur draufsteht, fährt den Weg auf der Oberfläche (in einer `stroemung` mit deren Tempo, auch bergab); nach Neustart wieder am Start | `pos` (Start, y = Oberfläche), `path`, `speed` 2.5, `start` 'stand' \| 'auto' \| 'signal', `wait` 0.6, `size` [3,3], `style` 'holz' \| 'bambus', `bob` 0.05, `sink` 0.08, `end` 'halt' \| 'zurueck' \| 'kreis', `reset` true → `{ state ('wartet'\|'faehrt'\|'ende'), s, speedNow, start(), stop(), reset(), info() }` | `{ type: 'floss', id: 'floss', pos: [0,0.4,-134], path: [[0,0.4,-134],[0,0.4,-146],[-6,0.4,-150],[-6,-0.6,-161.5]] }` |
| `stroemung` | fließende Gift-/Wasserbahn (auch mit Gefälle = Abwärtsströmung); Gift tötet (`kill`), Wasser trägt Schwimmer (`current`) | `from`, `to` (Oberfläche, achsenparallel), `width` 6, `speed` 6, `fluid` 'gift' \| 'wasser', `depth` 1.5, `kill` (gift true), `foam` true, `banks` true → `{ speed, dir, inside(x,z), info() }` | `{ type: 'stroemung', id: 'strom', from: [-6,0.4,-150], to: [-6,-0.6,-164], fluid: 'gift' }` |
| `wolkenplattform` | Wolke: von unten durchspringbar, federt ein, optional fahrend und/oder verpuffend | `pos` (Mitte unten), `size` [3,0.6,3], `path`, `speed` 2, `mode`, `wait` 0.5, `phase`, `idle`, `sink` 0.2, `vanish` 0, `respawn` 3, `color` 'weiss' \| 'grau' \| 'rosa' \| 'gold', `oneWay` true, `hidden` → `{ state ('da'\|'zittert'\|'weg'), load, start(), stop(), reveal(), hide(), info() }` | `{ type: 'wolkenplattform', id: 'wolke1', pos: [6,2.2,-236], vanish: 1, respawn: 2.5 }` |
| `wurfball` (kind; auch type, Liste `balls`) | Aktion hebt auf/wirft (Ducken + Aktion: absetzen); trifft im Flug und schnell rollend (≥ 2,5 m/s) Gegner (`onHit('throw', ball)`), POW, Druckschalter, Sterne/Münzen (für die Werferin), Zielscheiben, Gong, alles mit `onBallHit(ball)`; treibt im Wind; reist durch Glasröhren | `pos`, `size` 0.45, `speed` 15, `lift` 3, `bounce` 0.5, `life` 4, `respawn` 1.5, `color` 'weiss' \| 'rot' \| 'gelb', `id`, `hidden` → `{ thrown, hits, lastHit, info() }` | `{ type: 'wurfball', id: 'ball', pos: [4,0,-254] }` |
| `zielscheibe` (kind; auch type, Liste `targets`) | Treffer klappt sie um; alle der Gruppe → `onAll` (einmal) | `pos` (Scheibenmitte), `yaw` −π/2, `size` 1.2, `group` 'ziele', `onHit`, `onAll`, `by` 'ball' \| 'alles', `stand` 0, `reset` 0, `id`, `hidden`; `level.targets[group] = { n, of, done }` | `{ type: 'zielscheibe', group: 'ziele', onAll: { coins: 5 }, stand: 1, targets: [{ pos: [3,1.6,-264] }, { pos: [7,1.6,-264] }] }` |
| `riesenfrageblock` (kind; auch type) | großer ?-Block: Stampfen oben drauf oder Explosion lässt ihn zum Turm wachsen (trägt die Figur mit), Inhalt springt heraus | `pos` (Mitte unten), `size` 2, `grow` 6, `speed` 3, `content` 'coins:5' \| Aktion, `onGrow`, `trigger` ['pound','bomb'] (+ 'bump', 'mega'), `attach`, `id`, `hidden` → `{ state ('bereit'\|'waechst'\|'turm'), height, grow(), info() }` | `{ type: 'riesenfrageblock', id: 'riesen', pos: [-6,0,-257], grow: 5, content: 'coins:3' }` |
| `deco_w6` | Kulisse (verschmolzen) | `items: [{ kind, pos, … }]`, `shadow: false`; Arten: wolke, wolken, bergkiefer(n), fels(en), bergblumen, menhir, mast, fass, kiste, anker, steuerrad, wrackteil, laterne (`hang`), laternenpfahl, bambus, kirschbaum, paravent, dschungelbaum, farn(e), liane, riesenblatt, pilze, schneehaufen, schneekiefer, eiszapfen (from→to), zahnrad, rohr (from→to), schornstein, warnstreifen, minenbalken(_reihe), minenlampe, kristalle, lore, schienen; nur mit Registry-Modell: wolkenberg, wolkenfels, wrack (`part` 'bug' \| 'mast'), geisterschiff, dach, holzbruecke (nur Optik), giftbluete, giftpilz, kessel, schachtgeruest, eiszapfenbuendel | `{ type: 'deco_w6', items: [{ kind: 'laternenpfahl', pos: [-4,1,-110] }, { kind: 'kirschbaum', pos: [11,1,-125] }] }` |

Hinweise für Level-Bauer: Kippschiff/-steg nur achsenparallel (90°-Raster). Glasnetz-Öffnungen ≈ 1 m über dem Boden
(Mitte; Hineinlaufen genügt), Röhren dürfen sich nicht kreuzen (Kreuzung = Knoten). Deckengitter so hoch legen, dass die
Figur im Sprung die Hände hinbekommt (Gitter ≤ Boden + ≈ 3,8 m; die Füße hängen 1,15 m unter dem Gitter). Quetschblock-Rillen
mit `wall`-Blöcken bauen (Einklemmen braucht eine feste Gegenfläche). Den Floß-Weg auf der Oberfläche der Strömung enden
lassen.

### Präzisierung (Motor und Bausteine Welt 6): Signale, Zustände, Schnittstellen

- **Signale**: Gong → `level.signal(spec.signal ?? 'gong', { pos, source, via })` je Schlag (`via` 'tap' \| 'action' \|
  'pound' \| 'hit' …), z. B. für eine Rätselbox (`level.onSignal('gong', …)`). Weichen hören auf
  `level.signal(weichen.K.signal)` (schaltet um) und auf die Aktion `{ toggle: netzId }`. Signal-Verben an benannte Handles:
  Tür `open`/`toggle`, Windfeld/Förderband/Quetschblock/Floß/Wolke/Quelle `start`/`stop`(/`toggle`), versteckte Teile
  `reveal`/`hide`.
- **Neuer Spielfigur-Zustand** `proxy.course.state = 'hang'` (siehe oben; Ersatz `'trapeze'`); das Wandgitter nutzt den
  vorhandenen Zustand `'fence'`, Glasröhren `'pipe'`; Pilz-Maske = Helm `player.helmet = 'maske'`.
- **Schnittstellen für den Gegner-Agenten**:
  - `level.isMaskedFrom(gegner, figur?)` – true = Gegner sieht die Figur nicht (Maske + zugewandt, ±75°); Gegner, die
    bemerken/verfolgen, prüfen das vor dem Bemerken. `player.masked` ist direkt lesbar.
  - Wind: `windAt(level, x, y, z, out)` (Summe aller Windfelder, m/s) und `pushFigures(level, inside, vx, vy, vz, dt, ground)`
    für die Pustewolke (eigener Atem-Wind); Entitäten mit `windK > 0` treiben in Windfeldern.
  - Glasnetz: Entitäten mit `enemy`, `carryable` oder `pipeable` (nicht `boss`) reisen mit; optional `onPipeEnter(net, knoten)`,
    `onPipeExit(net, knoten)` (Knotenname der Öffnung); `pipeable: false` schließt aus.
  - Kippschiff/-steg/Wippe: Entitäten mit `weight` (Gegner Standard 1) neigen sie; `tilter.push(deg)` kippt einmalig (Schubser).
  - Quetschblock: `onHit('crush', handle)` bei Einklemmen, sonst wird geschoben.
  - Wurfball: `onHit('throw', ball)`; beliebige Entitäten mit `onBallHit(ball)`.
  - Riesen-?-Block: `onHit('bomb')` (Zündkopf, Kickbombe über explodeAt / Form `breakable`).
  - Gong: `w6(level).gongs[i].ring(via)` (z. B. ein Panzer schlägt ihn).
  - Stachelkugel ist `enemy` + `spiky` (verletzt auch von oben); Bosse können sie per `level.spawn('stachelkugel', …)` erzeugen.
- **Klänge** über `w6Sfx(level, name)`: eigener Effekt, sobald es ihn in `src/audio` gibt, sonst Ersatz – `gust`→swoop,
  `wind`→hover, `rumble`→land, `door`→gate, `poof`→vanish, `splash`→splash_big, `bump`→blockhit, `powerup_appear`→powerup.
  Wunsch an den Audio-Agenten: diese Namen als eigene Effekte.

### Präzisierung (Motor und Bausteine Welt 6): Modelle

Die Bausteine übernehmen die Welt-6-Modelle der Registry (`gimmicks_w6.js`, `props_himmel_w6.js`, `props_halle_w6.js`), sonst
eigene Ersatz-Geometrie mit gleicher Kollision und Mechanik:

| Modell | genutzt von | Optionen / Zustand aus dem Baustein |
| --- | --- | --- |
| `glasroehre_teil` | Kreuzungen des `glasnetz` (waagerecht, rechtwinklig: kind 't' \| 'kreuz') | { kind, radius }; Röhren selbst eigene Geometrie (beliebig gebogen) |
| `stachelkugel` | `stachelkugel` | { size, color }; state { anim 'roll', roll } |
| `wurfball` | `wurfball` (auf size/0,5 skaliert) | state { anim 'idle' \| 'carried' \| 'thrown', roll } |
| `pilz_maske` | Item (`mode: 'item'`), am Kopf (`mode: 'kopf'`, size 0,46) über `HELMETS.maske.fallbackModel` | — |
| `riesen_frageblock` | `riesenfrageblock` | { size, height: grow }; state { grow, anim 'bump' \| 'idle' } |
| `schiebetuer` | `schiebetuer` (ohne eigenen Rahmen; 'links' gespiegelt) | { width, height, panels }; state { open, hint, tap } |
| `gong` | `gong` (× size/1,44) | state { anim 'ring' \| 'idle', ring } |
| `klettergitter` | `klettergitter` mit style 'bambus' \| 'liane' (Wand gedreht, Decke liegend) | { size: [w,h] }; state { shake } |
| `windboe_fahne` | `windfeld` mit `fahne` | state { wind, dir, gust } |
| `foerderband` | `foerderband` Boden | { length, width, thick }; state { offset } |
| `quetschblock` | `quetschblock` style 'metall' (auf/ab ohne Kolben) | { size, rod }; state { warn, slam } |
| `kippsteg` | `kippsteg` | { length, width, thick }; state { tilt 0, warn } |
| `wippe` | `wippe` (Bock bis zur Stütze, height 2,2) | { length, width, thick, height }; state { tilt } |
| `wolkenplattform` | `wolkenplattform` weiß | { size }; state { anim 'step' \| 'idle' } |
| Kulisse | `deco_w6` (gebacken) | bergkiefer, tanne_schnee, kirschbaum, papierlaterne, riesenblatt, dschungel_liane, lore, zahnrad, wolkenberg, wolkenfels, geisterschiff_wrack, geisterschiff, fernost_dach, holzbruecke, giftbluete, giftpilz, kessel, schacht_geruest, eiszapfen |

Das **Kippschiff** baut seinen Rumpf selbst: das Registry-`geisterschiff` hat ein erhöhtes Achterdeck und einen geschwungenen
Deckssprung, die Lauffläche muss aber eben zur Kollision (TiltDeck) passen. Takelage und Segel sind ein eigenes Mesh, das
durchscheinend wird, wenn es die Figur verdeckt (`view.xray`); ebenso die Decke über einem Deckengitter.

### Präzisierung (Motor und Bausteine Welt 6): Themen

| Thema | Name | Stimmung / Hintergrund |
| --- | --- | --- |
| `clearpipe` | Glasröhren-Bergland | heller Himmel, Wolkenmeer, Bergspitzen mit Glasröhren (`cloudpeaks`) |
| `stonecircle` | Steinkreis | Wolkenboden, Menhir-Ring als Ellipse um die Arena (`stonering`) |
| `wreck` | Geisterschiffe | Abendlicht über nebligem Meer, schaukelnde ferne Schiffe (`ghostsea`, seaLevel −1); Stimmung `laderaum` (`view.setMood('laderaum')`), Unterwasser automatisch (trübes Grün, Lichtflecken); Laternenlicht grünlich |
| `fareast` | Fernost-Halle | rosiges Licht, Tal mit Laternen, fallende Kirschblüten (`fareast`); eigene Fantasie-Gestaltung ohne reale religiöse Symbole |
| `jungle` | Giftsee-Dschungel | dunstiges Grün, lila Giftsee (`junglelake`, seaLevel −0,6) |
| `snowwind` | Windige Schneegipfel | kalter Himmel, Schneegipfel, Schneetreiben (`snowpeaks`) |
| `factory` | Himmels-Maschinenhalle | Wolkenfabrik mit drehenden Zahnrädern (`skyfactory`) |
| `fuzzymine` | Wuschel-Schacht | dunkler Schacht nach oben, warmes Figuren- und Laternenlicht, aufsteigender Staub (`mineshaft`) |

`skyway` (6-Panzer) und `circus` (6-C) sind vorhanden. Jedes Thema lässt sich in `0-23` mit `?theme=<name>` ansehen.

### Präzisierung (Motor und Bausteine Welt 6): Welt 6 – Gimmick → Baustein

| Gimmick (Bauplan) | Baustein |
| --- | --- |
| verzweigtes Glasröhren-Netz, Röhren an Wänden (6-1, 6-5, 6-A) | `glasnetz` (Weichen, Fenster, Kanonen-Ende, Mitnahme) |
| Stachelkugeln (6-1) | `stachelkugel`, `stachelkugel_quelle` |
| kippende Schiffe, 1 m Kippsteg (6-2) | `kippschiff`, `kippsteg` |
| gefluteter Laderaum (6-2) | Thema `wreck` (Stimmung `laderaum`, Unterwasser) + `water` |
| Schiebetüren antippen, Scheinwände (6-3) | `schiebetuer` (`behind: 'wand'`) |
| Gong: Münzregen / Rätselbox (6-3) | `gong` (`coins`, `onHit`, Signal `gong`) |
| Pilz-Maske (6-3) | `pilz_maske` + `level.isMaskedFrom` |
| Floß im Giftsee, Abwärtsströmung (6-4) | `floss`, `stroemung`, `giftwasser` (Welt 4) |
| Klettergitter, kletterbare Wand (6-4, 6-6) | `klettergitter` (Wand/Decke) |
| Windböen über Abgründen (6-5) | `windfeld` (+ `fahne`) |
| Förderbänder Boden und Wand (6-6) | `foerderband` (boden/wand/rund) |
| Wolken (6-6, 6-7) | `wolkenplattform` |
| Quetschblöcke (6-7) | `quetschblock` |
| Wippen (6-7) | `wippe` |
| Wurfbälle, Schalterfelder (6-Haus) | `wurfball`, `zielscheibe`, `pow`, `pswitch` |
| große ?-Blöcke wachsen zu Türmen (6-Panzer) | `riesenfrageblock` |

### Präzisierung (Motor und Bausteine Welt 6): Tests und Kennzahlen

`tests/course_w6_blocks.mjs` (Port 4600, `W6B_PART=mech|themes`, `W6B_SHOTS=0` ohne Bilder): je Mechanik mit Gegenprobe –
Glasnetz (Weiche, Signal, Stick, Ball und Pilzling reisen mit), Stachelkugeln (Treffer auch von oben, Quelle), Kippschiff
(Welle, Gewicht, Deck folgt, Rutschen, Mitte bleibt waagerecht), Kippsteg, Schiebetür/Scheinwand, Gong (Stampfen, Signal,
Maske erscheint, Münzregen, Abklingzeit, Antippen), Pilz-Maske (zugewandt/abgewandt, Treffer schlägt ab), Floß/Strömung/Gift,
Wand-/Deckengitter (greifen, klettern, hangeln, Rand, loslassen), Windböen (Ruhe/Vorwarnung/Böe, Boden/Sprung), Förderbänder
(Boden, umgekehrt, Wandstufe, rund), Quetschblöcke (Takt, daneben heil, eingeklemmt tot, seitlich geschoben), Wippe/Wolke,
großer ?-Block (Stampfen, Explosion), Wurfball (Gegner, Zielscheiben, vorbei = nichts, POW), Ziel; keine Konsolenfehler.
Kennzahlen (inkl. Schattenpass): Stationen höchstens 63 Zeichenaufrufe / 163 k Dreiecke, Themen höchstens 72 / 174 k
(Grenzen 120 / 300 k).

### Präzisierung (Figuren und Klänge Welt 6): Pose 'hang', eigene Klänge

Additiv. **Pose `'hang'`** (`src/three/avatars/hero.js`: `poseHang`, Tabelle `HANG_POSE`; Lotti und Greta, groß/klein, Kostüme,
Stern, Riesentrank, Klone, Halloween-Verkleidung): `HeroAvatar.courseStates` (Set aller Kurs-Zustände mit eigener Pose) enthält
`'hang'` – HeroRig zeigt keinen Ersatz `'trapeze'` mehr. Beide Fäuste per Arm-IK (Gummi-Arme wie am Trapez) im Gitter:
Gitterebene = Körperhöhe der Hitbox (0,95 / 0,65 m) + `HANG.arm` (0,2 m) über dem Fußpunkt, Faustmitte 1,2 cm darunter (bei
Änderung von `HANG.arm`/`HITBOX` in `HANG_POSE` nachziehen). Hand über Hand im Takt des tatsächlich zurückgelegten Wegs entlang
der Blickrichtung (`speed` begrenzt; am Rand steht die Figur trotz Stick → kein Hangeln in der Luft), 1,0 m je Doppelgriff:
die haltende Hand liegt fest im Gitter, die andere löst sich (bis 15 cm), schwingt vor und greift. Körper als Feder-Pendel um
die Griffe (Anfahren: Füße zurück, Bremsen: vor, je Griff ein kleiner Schwung, seitlich zur haltenden Hand; im Stillstand sachtes
Schaukeln), Beine als zweites Pendel mit Nachlauf, Knie leicht angezogen; Zöpfe/Haar/Schweife hängen über die Physik. HeroRig
gibt zusätzlich `proxy.course.hangGrid` (Gitter-Rechteck des Motors) weiter: am Rand bleiben die Griffe im Gitter bzw. am
Randstab (seitlich nicht näher als 0,4 Einheiten an der Körperachse). Riesentrank: Gitter in Brusthöhe → Griff vor dem Bauch
(Kopf ragt durch die Decke wie am Trapez). Loslassen blendet 0,3 s in den Fall. Kennzahlen: Zeichenaufrufe und Dreiecke gleich
der Stand-Pose (Lotti 9 / 28,6 k, Greta 9 / 24,0 k, Krallen-Anzug 10, mit Verkleidung wie im Stand). `view/Xray.js`: Prüfpunkt
der kleinen Figur in 0,6 m Höhe (vorher 0,9 m – unter einem Deckengitter lag er in der Decke, die dann deckend blieb).
Test `tests/posen_w6.mjs` (Port 4365 + `PORT_BASE`; `P6_SHOTS=0`, `P6_HEROES`, `P6_PARTS=hang,extra`, `P6_DEBUG=1`; Bilder
`tests/out/posen_w6_*.png`, Bögen `posen_w6_sheet_<heldin>.png`).

**Klänge:** eigene Synth-Effekte in `src/audio/sfx.js` (Listen `W6_SFX`, `HW_SFX`, auch `engine.effects.w6/hw`) – Welt 6:
`gust`, `wind`, `rumble`, `door`, `poof`, `splash`, `bump`, `powerup_appear`, `gong`; Halloween: `klingel`, `tuer`,
`alle_tueren`, `kessel`, `blase`, `netz`, `laterne`, `laterne_aus`, `suessigkeit`, `muenzregen`, `buh`, `grabstein`,
`kuerbis_platzt`. `level.sfx(name)` findet sie direkt (auch die bisher stummen direkten Aufrufe `splash`, `bump`, `rumble`,
`poof`, `powerup_appear` anderer Bausteine/Gegner). Die Ersatz-Tabelle in `w6Sfx` ist leer, die Ersatznamen der `hwSfx`-Aufrufe
greifen nur noch für neue Namen. Lautheit wie die bestehenden Effekte (Median −22,7 LUFS), ≤ 21 Knoten, ≤ 1,1 s;
Hörprobe `tests/out/sfx_demo_w6.wav` (`tests/audio.mjs`, `AUDIO_PART=sfx`).

## Präzisierung (Gegner Welt 6)

Ergänzung des Gegner-Agenten Welt 6 „Wolkeninseln“ (Stand: Wolken-Gegnerzoo `0-24`, Wolken-Bossarenen `0-25`). Nichts oben
Festgelegtes wird geändert; alles ist additiv. Level-Bauer schreiben nur Daten; alle Felder sind optional, sofern nicht anders
vermerkt. Gemeinsame Felder und Konter aus „Präzisierung (Gegner/Power-ups)“ und „(Gegner Welt 2–5, Halloween)“ gelten weiter
(`id, pos, dir|yaw, path, loop, wake, edges, drop`; Ziel = nächste Figur, Lava/Absturz = besiegt, `STRONG` = cannon, bomb,
mega, star). Jede Datei dokumentiert ihre Parameter vollständig im Kopfkommentar. Kindgerecht: Schubser stoßen **ohne Schaden**
(gefährlich ist nur, wohin man fällt), Gelee-Brocken zerplatzen in Bitcoins, Attrappen verpuffen in lila Rauch.

### Präzisierung (Gegner Welt 6): Dateien

```
src/course/entities/w6help.js                  Hilfen (außerhalb kinds/): shoveFigure (Stoß ohne Schaden), approachSpeed,
                                               dirFromTo, shoveAABB, pushFigures (wie w6kit), waterIn, Lcg, bossManaged
src/course/entities/kinds/schubser_w6.js       schubser (+ slideStep: Rutsch-Physik, auch für den Prinzen)
src/course/entities/kinds/pustewolke_w6.js     pustewolke
src/course/entities/kinds/glotzfisch_w6.js     glotzfisch
src/course/entities/kinds/stachelwerfer_w6.js  stachelwerfer, stachelkugel_wurf (geworfene Stachelkugel)
src/course/entities/kinds/wuschel_horde_w6.js  wuschel_horde
src/course/entities/kinds/schubser_prinz_w6.js schubser_prinz (Boss 6-A)
src/course/entities/kinds/wuerfelblase_w6.js   wuerfelblase (Boss 6-C), gelee_brocken
src/course/entities/kinds/wirbelbrocken.js     + decoys (Teleport mit Attrappen, 6-Panzer), wirbelbrocken_attrappe
src/course/archetypes/kinds/boss.js            + LEVEL.bosses (mehrere Kämpfe nacheinander in einem Level)
src/course/entities/Enemy.js, EnemyW2.js       + maskedFrom(level, gegner, figur); canSee übersieht eine maskierte Figur
src/course/entities/kinds/spuk.js, hackbeil_w5.js, flatterfledi_hw.js   + Pilz-Maske (je eine Zeile)
src/course/levels/w0/0-24.js                   Wolken-Gegnerzoo (8 Reihen Gehege, Z(r, dz) wie 0-18/0-21, Thema clearpipe)
src/course/levels/w0/0-25.js                   Wolken-Bossarenen (Prinz-Käfig mit glasnetz, Zirkus-Rundkäfig, Rundkäfig)
tests/course_w6_enemies.mjs                    Port 4620, W6E_PART=1|2|3|4, Bilder tests/out/w6e_*.png
```

Modelle: die fertigen Welt-6-Modelle (`enemies_w6.js`, `bosses_w6.js`, Instanzen `instanced_w6.js`) – `schubser`,
`pustewolke`, `glotzfisch`, `stachelwerfer`, `stachelkugel` (Kugel des Werfers), `wuschel_horde`, `wirbelbrocken_attrappe`,
`schubser_prinz` (`model.mouth()`), `wuerfelblase`, `gelee_brocken` (Instanz-Gruppe je Farbe), `gelee_riese` (`form`), dazu
`boss_marker` (Landemarke) und `dizzyStars` (Schwindelsterne des Prinzen). Hammer- und Bumerang-Werfer sind die vorhandenen
`hammer_werfer`/`bumerang_werfer` (Welt 2, Modell `feuer_werfer`); ihr Bumerang kehrt zum Werfer zurück (Münzen sammelt er
nicht – das ist ein Gegner-Geschoss).

### Präzisierung (Gegner Welt 6): gemeinsame Regeln

- **Stoß ohne Schaden** (`shoveFigure(fig, dx, dz, speed, lift, lock)`): die Figur fliegt weg (Zustand `'hurt'` = Stolpern,
  `lock` s ohne Steuerung), verliert aber nichts; im Wasser treibt sie nur. Schubser rammen so; der Schubser-Prinz rammt
  dagegen mit Schaden.
- **Zurückstoßen** (Schubser, Prinz): Draufspringen (Abprall), Stampfattacke, Sprung oder Rennen gegen ihn (≥ 3 m/s auf ihn
  zu, in der Luft ≥ 1,5 m/s), Angriffe (Feuer, Tatze, Panzer, Wurf/Wurfball, Rutschen, Schwanzhieb, Faust, Stampfwelle)
  lassen ihn rutschen (Reibung, auf Eis kaum); er prallt von Wänden ab und fällt über Kanten.
- **Pilz-Maske** (Bauplan 6-3): alle „sehenden“ Gegner fragen vor dem Bemerken `maskedFrom(level, gegner, figur)` =
  `level.isMaskedFrom(gegner, figur)` (Motor und Bausteine Welt 6; Rückfall: `fig.masked` und Blick ±75°). Betroffen: alles
  mit `canSee` (Pilzling, Krallen-Pilzling, Pilzlingsturm, Rollpilz, Rammbock-Bulle, Schnapp-/Feuer-Schnappblume, Brummer,
  Kickbombe, Werfer-Brüder, Hackvogel, Hüpfqualle, Lavabrocken, Schneesäule, Eisläufer, Kürbling, Klapperknochen,
  Funkenkäfer, Funkenling, Zauberkröte, Schubser, Stachelwerfer, Pustewolke, zielender Glotzfisch, Gelee-Brocken), dazu
  Spuk (bleibt ruhig statt sich zu verstecken/zu folgen), Hackbeil-Pilz (`prey`), Flatterfledi (Sturzflug). Abgewandt sehen
  sie die Figur wieder.
- **Welt-6-Bausteine**: Pustewolke schiebt über `pushFigures` (blocks/w6kit.js) und ist während des Pustens eine Windquelle für
  `windAt` (in `w6(level).winds`); Schubser zählt auf Kippschiff/Kippsteg/Wippe als Last (`weight`, Standard 1) und kippt das
  Deck mit seinem Rammstoß einmalig (`tilter.push`, `tilt`°); Quetschblock (`onHit('crush')`) besiegt den Schubser; Gegner mit
  `enemy` reisen durch `glasnetz`, Bosse nicht (der Prinz fährt mit eigener Logik durch die Röhren eines Netzes, `net`).
  Die geworfene Stachelkugel des Werfers ist eine eigene Art (`stachelkugel_wurf`: Bogenflug, ein gebremster Hüpfer, dann
  rollen); die rollenden Stachelkugeln der Strecken sind der Baustein `stachelkugel`.
- **Sound** nur über vorhandene `level.sfx`-Namen: `step` (scharren), `swoop` (Anlauf, Pusten, Wurf), `bounce`, `slam`,
  `splash_big`, `hover` (Luft holen, Brocken ploppen), `fireball`, `pipe`, `blockhit`, `brickbreak`, `panic` (Flucht, Horde),
  `vanish`, `boss_hit`, `boss_spin`, `stomp`, `land`, `powerdown`; Fanfare `course_clear` über den Boss-Archetyp.

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| schubser | sieht die Figur → scharrt (Vorwarnung) → rammt; bremst an Kanten; patrouilliert/folgt/bewacht | Hinunterstoßen (Absturz, Lava, Wasser), Funkelstern, Riesentrank, Quetschblock; **Draufspringen federt nur** | nie (Stoß ohne Schaden) |
| pustewolke | schwebt; Atempause → holt Luft (Vorwarnung) → pustet einen Windkegel (dreht sich in der Pause zur Figur oder fest) | Draufspringen/Stampfen **in der Atempause**, jeder Treffer | nie (Wind) |
| glotzfisch | verborgen, lugt, springt im Takt im Bogen von Loch zu Loch (reihum bzw. zielend) | von oben (im Sprung), alle Angriffe | Berührung im Sprung |
| stachelwerfer | stemmt eine Stachelkugel über den Kopf und wirft sie (landet vor der Figur, rollt, prallt ab) | von oben (nicht mit Kugel über dem Kopf), alle Angriffe | von vorn/seitlich, Kugel über dem Kopf |
| stachelkugel_wurf | Bogen, ein Hüpfer, rollt (hangab schneller), prallt an Wänden, zerfällt nach life | Stern, Riese, Explosion, Kanone (Feuer/Tatze/Wurf lenken sie ab) | jede Berührung (auch von oben) |
| wuschel_horde | Front rückt nach Zeitplan/Tempo bzw. mit dem Autoscroll-Fenster nach | unbesiegbar | alles hinter der Front (Rückstoß von der Horde weg) |
| gelee_brocken | hüpft umher/zur Figur; im Boss-Kampf Baustein des Riesen | Draufspringen (1 Bitcoin), alle Angriffe | seitlich (im Flug harmlos) |
| schubser_prinz | Boss 6-A (siehe unten) | nur Tritt nach der Röhrenfahrt (3×) | Rammstoß, Feuerkugeln |
| wuerfelblase | Boss 6-C (siehe unten) | nur Hut-Treffer in der Flucht (3×) | Riese (seitlich, Landung, Schockwelle), Brocken |
| wirbelbrocken + decoys | Boss 6-Panzer: nach Treffer Teleport mit 1 bzw. 2 Attrappen | nur das Original, benommen (3×) | Fäuste (auch der Attrappen), Berührung |

### Präzisierung (Gegner Welt 6): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Schubser: behavior 'chase' (ohne path) | 'patrol' (path/geradeaus) | 'guard' (steht, kehrt heim), path, loop, speed 1.5,
  //   charge 5.5 (m/s Rammen), chargeTime 1.8, sight 8, warn 0.55 (s scharren), cool 0.9, push 9 (m/s Stoß auf die Figur),
  //   lift 5.5, friction 6 (m/s² Rutschen; Eis 1,2), weight 1 (> 1 rutscht kürzer, kippt Decks stärker), tilt 6 (°), size 1
  { kind: 'schubser', id: 'sb1', pos: [0, 2.5, -15], behavior: 'guard', sight: 6 },
  { kind: 'schubser', pos: [10, 2.5, -15], behavior: 'patrol', path: [[9, 2.5, -15], [14, 2.5, -15]] },
  // Pustewolke: pos = Unterkante der schwebenden Wolke; dir|yaw (feste Blasrichtung; ohne: dreht sich zur Figur), turn (Standard: true ohne dir, false mit dir),
  //   sight 10, reach 5.5 (m Kegel), angle 28 (°), height 2.2, strength 7.5 (m/s), ground 0.7, rest 1.6, inhale 0.7, blow 2.2,
  //   phase 0 (s Vorlauf im Takt), path, loop, speed 1, bob 0.12
  { kind: 'pustewolke', pos: [-16, 2.2, -33], dir: [1, 0], reach: 6 },
  // Glotzfisch: holes [[x, y, z], …] (y = Wasser-/Eisoberfläche; reihum) | pos + dir + dist 4 (pendelt), height 2.4, every 2.6,
  //   flight 1.1, phase 0..1, peek 0.45, aim false (true: Loch nächst der Figur, sight 6), color 'blau' | 'gelb' | 'rosa'
  { kind: 'glotzfisch', holes: [[-16, 2, -55], [-11.5, 2, -55], [-7, 2, -55]], height: 2.6, every: 2.4 },
  // Stachelwerfer: sight 10, interval 2.4, first 1.0, ball 0.55 (Ø), flight 0.8, lead 1.0 (m vor der Figur), range 8, roll 4,
  //   life 6, max 3, aim 'player' | 'dir', pace 0 (m tänzeln entlang axis [1, 0]), speed 1, path, loop
  { kind: 'stachelwerfer', pos: [-17, 1, -72], dir: [1, 0], sight: 11 },
  // geworfene Stachelkugel (auch einzeln): vel [vx, vy, vz] (Flug) | dir + roll (rollt los), size 0.55, roll 4, life 6,
  //   bounce 0.45, owner
  { kind: 'stachelkugel_wurf', pos: [0, 1, -80], dir: [1, 0], roll: 3, life: 10 },
  // Wuschel-Horde: pos = Mitte der Front beim Start (waagerecht: y = Unterkante), axis 'y' | '-y' | 'z' | '-z' | 'x' | '-x',
  //   follow 'scroll' (Front = Fenstermitte − behind 7 m), schedule [[t, Lage], …] | speed 1.5 (+ speeds [{ at, speed }]),
  //   delay 0, trigger { min, max }, end (Lage), size [quer1, quer2] (senkrecht [x, z] 8 × 8; waagerecht [Breite, Höhe] 8 × 3),
  //   depth 12, gap 6 (Neustart: so weit unter dem Neustart-Punkt), count 48 (≤ 64 je Schicht), layers 2 | 1
  { kind: 'wuschel_horde', id: 'horde', pos: [0, -6, -20], axis: 'y', follow: 'scroll', behind: 6.5, size: [10, 10] },
  { kind: 'wuschel_horde', pos: [11.5, 1, -123], axis: 'z', speed: 2, end: -109, size: [14, 3], trigger: { min: [4, 0, -122], max: [19, 6, -108] } },
  // Gelee-Brocken einzeln: size 0.5, color 'silber' (rot, blau, gruen, gelb, lila, orange, rosa, gold), speed 1.6,
  //   height 0.55, behavior 'hop' | 'chase', sight 7, coins 1, vel (startet im Flug)
  { kind: 'gelee_brocken', pos: [9, 1, -156], behavior: 'chase', color: 'blau' },
  // Werfer-Brüder (6-B, vorhanden): { kind: 'hammer_werfer' | 'bumerang_werfer' | 'feuer_werfer', pos, heights, … }
],
items: [{ kind: 'pilz_maske', pos: [0, 1, -129] }],   // Baustein; die Gegner oben übersehen eine zugewandte Figur
```

Laufzeit (für Tests und Gimmicks): Schubser `state` (idle | walk | warn | charge | skid | cool | pushed | fall | recover |
defeated), `rams`, `pushes`, `slide` (m/s), `fellBy` ('fall' | 'lava' | 'wasser'), `info()`; Pustewolke `state` (idle | rest |
inhale | blow | hit | defeated), `blows`, `pushed`, `inCone(x, y, z)`, `info()`; Glotzfisch `state` (wait | peek | jump |
defeated), `jumps`, `hole`, `next`, `apex`; Stachelwerfer `state` (idle | stand | throw | squashed | flipped), `throws`, `balls`, `overhead` (Kugel über dem Kopf); Kugel `state` (fly | roll | break),
`landAt`, `bounces`, `rolled`; Horde `state` (wait | delay | run | done), `front` (Lage), `clock`, `hits`, `resets`, `info()`.

### Präzisierung (Gegner Welt 6): Schubser-Prinz (6-A)

```js
{ kind: 'schubser_prinz', id: 'prinz', pos: [0, 2, -5] (Start), dir: [0, 1], arena: { min: [-10, -10], max: [10, 10], y: 2 }
    | { center: [x, y, z], size: [w, d] }, net: 'roehren' (glasnetz-Id) | pipes: [{ id, pos (Mündung unten an der Wand),
    dir (in die Arena), to, route }], hp: 3, charge: [6, 7, 8], chargeTime: [2.2, 2.0, 1.8], turn: [0.5, 0.7, 0.9],
  warn: [0.9, 0.7, 0.55], skid: [1.0, 0.85, 0.7], fire: [1, 2, 3], fireSpeed: 6.5, stuck: 3.5, stun: [3.0, 2.6, 2.2],
  push: 12, lift: 7, knock: 6, travel: 18, travelMax: 2.2, star: { pos, index }, wakeR: 10, drop, seed }
boss: { id: 'prinz', name: 'Schubser-Prinz', speed: 0, trigger, lock, warp, warpPos, warpTo, frame: 0.45, center }
segments: [{ type: 'glasnetz', id: 'roehren', nodes: { L0: [-9.95, 3, 0], R0: [9.95, 3, 0], … }, pipes: [{ from: 'L0', to: 'R0',
            via: [[-13.6, 3, 0], [-13.6, 3, -13.6], [13.6, 3, -13.6], [13.6, 3, 0]] }, …], ends: { L0: { enter: false }, … } }]
```

Ablauf: `wait` → `intro` (2 s) → `aim` (warn s: dreht sich, scharrt) → `charge` (Rammen, lenkt nach; Berührung **verletzt** und
schleudert weg) → `skid` (rutscht aus) → `fire` (0,8 s; 1 / 2 / 3 Feuerkugeln fächerförmig aus `model.mouth()`) → `aim` …
Zurückstoßen (`pushed`, Reibung 5 m/s², Abprall an den Käfigwänden). Rutscht/rennt er rückwärts oder vorwärts in eine
**Röhrenmündung** (≤ 1,55 m vor der Wand, quer ≤ 1,05 m, Bewegung zur Wand), steckt er fest (`stuck`, höchstens `stuck` s,
danach hüpft er heraus). **Noch ein Stoß** (Berührung, Draufspringen, Angriff) → `pipe`: Fahrt durch die Röhre (gestaucht,
im Glas sichtbar; Netz: der Röhre folgen bis zur nächsten Öffnung, an Kreuzungen Richtung Weiche) → `squeezed` (0,6 s, schießt
aus der Gegenöffnung in die Arena) → `stunned` (Schwindelsterne): **Tritt** (Draufspringen/Stampfen) = Treffer → `hit` (0,6 s)
→ `recover` → nächste Phase. Sonst ist Draufspringen nur ein Abprall (er rutscht davon); Feuer, Krallen, Panzer, Wurf,
Explosion, Stern, Riese stoßen ihn nur. 3 Treffer → `defeated` (2 s) → `gone` (Stern; Archetyp: Fanfare, Warp-Box). Ansagen:
„Stoß ihn in eine Glasröhre!“, „Noch einmal stoßen!“, „Jetzt draufspringen!“, „Er wird schneller!“, „Jetzt spuckt er drei
Feuerbälle!“. Tod im Kampf (`reset`): Prinz 3/3 am Start, Feuerkugeln weg. Schnittstelle wie Graf Brummbär (`begin, reset,
state, stateT, hp, maxHp, phase, visible, home, half, carHits 0, vulnerable, info()`, `level.onBossHit(boss, 'tritt')`,
`level.onBossDefeated`), `boss: true`, kein `enemy`. Laufzeit: `charges, fireballs, pushes, stucks, trips, tripLog
([{ from, to }]), hits, hitLog, bounces, rams, pipe, pipes` (Mündungen, aus `pipes` bzw. dem Netz).

### Präzisierung (Gegner Welt 6): Würfelblase (6-C)

```js
{ kind: 'wuerfelblase', id: 'blase', pos: [0, 2, -63], arena: { center: [0, 2, -60], r: 11.4 }, hp: 3, bits: [10, 13, 16],
  jumps: [3, 4, 5], size: 3.2, minSize: 1.6, bitSpeed: [1.6, 1.9, 2.2], air: [1.2, 1.05, 0.9], rest: [0.9, 0.75, 0.6],
  height: 5, shockR: 6, shockSpeed: 7, flee: [4.5, 4.0, 3.5], fleeSpeed: [3.0, 3.6, 4.2], colors: ['rot', 'blau', 'gruen',
  'gelb'], giantColor: 'silber', star: { pos, index }, wakeR: 12, drop, seed }
boss: { id: 'blase', name: 'Würfelblase', speed: 0, trigger, warp, warpPos, warpTo, frame: 0.4, center }
```

Ablauf: `wait` → `intro` (2,4 s; bei 0,7 s ploppen `bits` bunte Gelee-Brocken aus ihr) → `gather` (die Brocken hüpfen zu ihr
und gehen in ihr auf; sie ist dabei **geschützt**, höchstens 6 s) → `form` (0,7 s: **silberner Gelee-Riese**, Kante
`S = minSize + (size − minSize) · n / bits[Phase]` aus den n aufgegangenen Brocken – **besiegte Brocken verkleinern ihn**; ohne
Brocken flieht sie sofort) → je Sprung `gcrouch` (0,35 s) → `gair` (air s, Bogen `height` m auf die Stelle der Figur, rote
**Landemarke** im Grundriss, wachsender Schatten) → `gland` (Aufprall verletzt im Grundriss, **Schockwelle** 0,45 m hoch bis
`shockR` – drüberspringen) → `grest` … Nach dem letzten Sprung platzt der Riese (`split` 0,8 s, die Brocken hüpfen danach
herum: Berührung verletzt, Draufspringen besiegt) und **die Würfelblase flieht** (`flee`, von der Figur weg, am Rand entlang):
jetzt ist **ihr Hut verwundbar** (Draufspringen/Stampfen nach 0,35 s) → `hit` (0,6 s) → neue Brocken (`bits[P] − bits[P−1]`)
→ `gather` … Flieht sie unversehrt, sammelt sie wieder ein (gleiche Phase). 3 Treffer → `defeated` (1,6 s, zerläuft, übrige
Brocken zerplatzen) → `gone` (Stern; Archetyp: Fanfare, Warp-Box). Ansagen: „Weich dem Riesen aus – spring über die Welle!“,
„Spring auf ihren Hut!“, „Der nächste Riese wird kleiner!“, „Mehr Gelee-Brocken!“, „Jetzt springt der Riese noch öfter!“.
Tod im Kampf: alles zurück. Schnittstelle wie oben (`level.onBossHit(boss, 'hut')`), Laufzeit: `giants, sizes, giantSize,
jumpsDone, landings, waves, merged, bitsDown, splits, flees, hits, hitLog, bounces, misses, markerShown, isGiant, S`.

### Präzisierung (Gegner Welt 6): Wirbelbrocken mit Attrappen (6-Panzer)

`{ kind: 'wirbelbrocken', id, pos, arena: { center, r }, decoys: true | [0, 1, 2], ring: 0.55, seed }` – wie Welt 2, aber nach
einem Treffer statt der Panzerkugel: `teleport` (0,5 s, wirbelt und schrumpft) → `hidden` (0,5 s) → `appear` (0,7 s: fällt auf
einen Platz eines Rings `ring · r`; auf den übrigen Plätzen erscheinen 1 bzw. 2 **Attrappen** `wirbelbrocken_attrappe`, die im
selben Takt laufen, wirbeln und taumeln und ≥ 2,6 m Abstand halten). **Nur das Original zählt** (benommen: Draufspringen/
Stampfen); eine Attrappe verpufft bei Draufspringen (Abprall) oder Angriff; ihre Fäuste verletzen. Ein Treffer am Original lässt
alle Attrappen verpuffen. Ansage beim ersten Teleport „Nur der echte Wirbelbrocken zählt!“. Ohne `decoys` unverändert.
Laufzeit: `teleports, decoys, decoysMade, decoysPopped`.

### Präzisierung (Gegner Welt 6): Boss-Archetyp – mehrere Kämpfe (`LEVEL.bosses`)

`bosses: [cfg, …]` statt `boss` (jeder Eintrag wie `LEVEL.boss`): der erste ist aktiv; betritt die Figur außerhalb eines Kampfs
den `trigger` eines anderen, noch nicht gewonnenen Eintrags, wird er der aktive Kampf (Lebensleiste, Sperre, Warp-Box, Tod →
nur dieser Kampf von vorn). `info().active` = Id des aktiven Endgegners. Endgegner erkennen „vom Archetyp gesteuert“ über
`bossManaged(level, id)` (beide Formen). Ein einzelnes `boss` bleibt wie bisher.

### Präzisierung (Gegner Welt 6): Hinweise für Level-Bauer

- **Schubser (6-2, später 7-4)**: auf Decks/Plattformen mit Kanten stellen – er bremst selbst an Kanten, fällt nur gestoßen.
  Ein Stoß auf ihn trägt ihn 2,5 m (Draufspringen) bis ≈ 5 m (Stampfen/Rennen); der Rammstoß trägt die Figur ≈ 4–5 m
  (`push`/`lift`). Für „2 Schubser besiegen → Warp-Box“ eine Arena-/Aufgaben-Zählung über `level.onEnemyDefeated` (Absturz
  zählt). Auf `kippschiff`/`kippsteg` kippt sein Rammstoß das Deck zusätzlich (`tilt`).
- **Pustewolke (6-5)**: Wolken ≈ 1,2–1,6 m über dem Weg (Draufspringen muss erreichbar sein), Kegel `reach` ≤ Lücke + 2 m;
  über Abgründen Windfelder der Bausteine und Pustewolken nicht überlagern (beides addiert sich). `phase` versetzt mehrere.
- **Glotzfisch (6-5)**: `holes` auf die Löcher im Eis bzw. Wasserflächen legen (y = Oberfläche); der Bogen ist `height` m hoch –
  Wege zwischen zwei Löchern werden überquert. Zielend (`aim`) nur mit mehreren Löchern sinnvoll.
- **Stachelwerfer (6-3)**: im Käfig der Rätselbox eine Wand hinter der Figur: Kugeln prallen ab. Auf Rampen rollen die Kugeln
  hangabwärts schneller (bis ×1,35).
- **Wuschel-Horde (6-7)**: im senkrechten Autoscroller `follow: 'scroll'` mit `behind` ≈ `frame.back` + 1 (die Front ist
  unten am Bildrand sichtbar), `size` = Schachtquerschnitt; ohne Autoscroller `speed`/`schedule` und `trigger`.
- **Pilz-Maske (6-3)**: Gegner, die die Figur nicht sehen sollen, so stellen, dass sie ihr zugewandt sind (z. B. Pilzling-
  Wachen vor Schiebetüren). Ohne Maske bemerken sie die Figur wie gewohnt.
- **6-A**: Käfig ≈ 20 × 20 m, `glasnetz` mit Öffnungen an den Seitenwänden (Knotenmitte 1 m über dem Boden, an der Wand) und
  Röhren, die hinter dem Käfig herumführen (sich nicht kreuzen); `ends: { …: { enter: false } }`, wenn die Figur nicht hinein
  soll. Prinz mit `net` und `arena` (Rechteck = Innenfläche). Vorderwand niedrig mit unsichtbarer Kollision darüber (wie 0-25).
- **6-C**: runde Arena r ≥ 11 m ohne tiefe Decke (der Riese springt 5 m + Kante hoch), Startplatz vorn, `boss.trigger` innen.
- **6-Panzer**: `wirbelbrocken` mit `decoys: true` in der Arena nach der Fahrt (`scroll.with: 'boss'` wie 2-Panzer).

### Präzisierung (Gegner Welt 6): Tests und Kennzahlen

`tests/course_w6_enemies.mjs` (Port 4620, `?course=0-24|0-25&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`;
Hilfen `window.__t`: `Z(r, dz)`, `place`, `stomp`, `touch`, `until`, `hold`, `mask`, `face`, Boss: `enter`, `untilState`;
`W6E_PART=1|2|3|4`, je Teil 2–6 min): Laden (alle Arten, Modelle ohne Platzhalter, Horde als Instanz-Gruppe, 10 s ohne Fehler)
· Teil 1 Schubser (scharrt → rammt ohne Schaden in die Lava, Draufspringen federt und schiebt, Stampfattacke stößt ihn in die
Lava – zählt, Feuerball ins Wasser, Gegenrennen, sanfter Schubs, Angriffe stoßen, Funkelstern besiegt, bremst an der Kante),
Pustewolke (Takt, Wind am Boden 0,92 m / in der Luft 1,31 m je 0,25 s, hinter ihr nichts, dreht sich, Atempause/Pusten,
seitlich harmlos, Feuer), Glotzfisch (reihum, Scheitel 2,6 m, lugt, verborgen harmlos, Berührung im Sprung, von oben, zielend,
Feuer) · Teil 2 Stachelwerfer (Kugel über dem Kopf, landet 6 m weit, prallt ab, von oben/seitlich gefährlich, Feuer lenkt ab,
Stern zerstört, von hinten harmlos, Rampe 5,4 m/s), Werfer-Brüder, Wuschel-Horde (wartet, steigt 1,2 m/s, verletzt mit
Rückstoß nach oben, Wolkenstufe sicher, Neustart, `follow: 'scroll'`, waagerecht), Pilz-Maske (Pilzling, Krallen-Pilzling,
Spuk, Schubser, Stachelwerfer, Pustewolke, Hackbeil-Pilz mit/ohne Maske, zugewandt/abgewandt; über `level.isMaskedFrom`),
Bestand · Teil 3 Schubser-Prinz vollständig (3 Röhrenfahrten L0→R0, R6→L6, L-6→R-6 über das glasnetz), Würfelblase vollständig
(Riese 3,2 → 2,71 m nach 4 besiegten Brocken, Sprünge 3/4/5), Wirbelbrocken mit 1 bzw. 2 Attrappen, Sieg → Stern, Warp-Box,
Zielmast; Tod setzt jeden Kampf zurück · Teil 4 Bilder `tests/out/w6e_*.png` und Zeichenaufrufe – 90 Prüfungen (25 + 23 + 33 + 9). Gemessen
(scale 2, inkl. Schattenpass): Gegnerzoo 38–73 Zeichenaufrufe (≤ 250 k Dreiecke, Thema clearpipe), Bossarenen 42–69
(≤ 169 k, Thema fortress); Simulation im Zoo (≈ 44 Entitäten) 0,09–0,34 ms je Schritt. Regressionen `course_enemies`,
`course_w5_enemies` (1–3), `course_hw_enemies` (1–3), `course_w2_enemies`, `course_w1_combat`, `course_physics`,
`course_w6_blocks` (mech) bestanden.

## Präzisierung (Level 6-1, 6-B und 6-2)

Additiv zur Welt-6-Liste: Titel und Besonderheiten der Level 6-1, 6-B und 6-2. Dateien `src/course/levels/w6/6-1.js`,
`6-B.js`, `6-2.js`, eigene Hilfen `src/course/levels/w6/_helpers_a.js` (kein `LEVEL`, nur für diese drei Level; nutzt
`Bld`, `cliffSkirt`, `savannaFloor` u. a. aus `w5/_helpers_b.js`, `leuchtturm`/`brandung` aus `w5/_helpers_a.js`,
`moewen` aus `w3/_helpers_d.js`), Test `tests/course_w6a.mjs`. Kein Motor-Code geändert; alle Sonderteile sind
level-lokal (Hilfsdatei, Haken `LEVEL.build`/`LEVEL.setup`). Gegner nach „Präzisierung (Gegner Welt 6)“.

### 6-1 „Röhrenreise über die Wolkengipfel“ (parcours · clearpipe · course_clearpipe · 400 s)

- Grüne Berggipfel über dem Wolkenmeer, ≈ 240 m nach −Z, stufenweise hinauf (y 1 → 7 → 11,5 → 16 → 20,5 → 15 → 24).
  Abschnitte: **Startgipfel** (Almwiese mit Hütte, Kühen, Murmeltieren; ein 7,5 m hoher Felsgrat quert den Gipfel – nur
  das Glasröhren-Netz führt hinüber, Kreuzung über dem Grat mit **Weiche**: ohne Stick rechts zum Hauptweg, Stick links
  zum Glasgang) → **Hinterwiese** (Feuer-Schnappblumen, querrollende Stachelkugeln, Glasgang, Warp-Box) →
  **Gegnerstrecke** (Gratweg mit Seilzaun, Schnappblumen und Stachelkugeln; gerade **Wuschel-Röhre** über die Kluft, drei
  Wuschel kreisen um sie; Checkpoint) → **Röhrensteigung** (Röhrenbogen, Röhren mit Weiche, Steigröhre über drei
  Terrassen, Wuschel-Kreise, versteckte Wolkenkanone in den **Münzhimmel** bei x ≈ −46, y ≈ 42 mit eigener
  Kameraschiene, Röhre zurück; Warp-Box 2) → **Schnappblumen-Feld** (Blumengarten, fünf Schlüsselmünzen öffnen die
  versteckte Warp-Box 3) → **Zielgipfel** (Steinmann, Rastbank, Fernrohr, Picknickdecke, Regenbogen, Zielmast).
- Sterne: 0 hinten im **Glasgang** (lange Glasröhre mit drei großen Stachelkugeln; nur mit dem Funkelstern aus dem
  ?-Block davor – mit Treffer-Blinken kommt man nicht durch) · 1 oben auf der Wuschel-Röhre (hinaufklettern, zwischen den
  kreisenden Wuscheln; beim Durchfahren nicht erreichbar) · 2 Münzhimmel (Wolkenkanone, Wolkenkette). Stempel: über dem
  Röhrenbogen (von Terrasse 2 auf den Bogen, dann Sprung; von der Terrasse aus zu hoch).
- Wuschel-Kreise und Kugelreihen liegen neben bzw. hinter den Röhrenausgängen (wer aus einer Röhre kommt, hat erst
  Platz); die Kugelreihe vor der Warp-Box 2 lässt links den Ausgang der Münzhimmel-Röhre frei.
- Extraleben: versteckter Block vor der Tür der Almhütte. Gegner: Stachelkugel 19, Wuschel 28, Schnappblume 17,
  Feuer-Schnappblume 4; Schlüsselmünzen 5, Warp-Boxen 6 (3 Paare).
- Budget: Stachelkugeln (≈ 5700 Dreiecke je Stück, im Schattenpass doppelt) werfen nur im Umkreis von 11 m einen
  Sonnenschatten (`schattenNah`, Haken in `setup`); Gipfelflanken (`gipfel`/`grat`) ohne Schattenwurf; Münzen
  `instances.coin { farHide: 44, shadow: false }`. Der Felsgrat (`isl` mit `xray`) trägt eine eigene gebänderte Felswand
  mit Moospolstern (`felswand`, ebenfalls bei `view.xray` angemeldet – wird mit dem Block durchscheinend).

### 6-B „Werfer-Wirbel im Steinkreis“ (arena · stonecircle · course_arena · 100 s, 1 Stern)

- Runde Schwebeinsel (R 11,6 m, `wolkeninsel` mit Zylinder-Kollision) über dem Wolkenmeer; innerer Steinkreis aus
  bemoosten Menhiren (hinten und seitlich, vorn frei für die Kamera) und drei **Trilithen** (Deckstein 2,8 m, Einweg von
  unten). Feuer-Werfer hinten, je ein Hammer-Werfer links/rechts springen zwischen Boden und Deckstein (`heights`), zwei
  Bumerang-Werfer vorn auf der Wiese. Flacher **Altarstein** in der Mitte (dort erscheint der Stern), Werferlager,
  Fackeln, Wimpel, Blumen, Grasbüschel, Murmeltiere, Vogelschwarm, Wolkenkragen.
- ?-Block mit Funkenblüte und Münzblock vorn. Tod setzt die Arena zurück (alle fünf Werfer neu, Zeit voll).

### 6-2 „Schaukelschiffe im Nebelmeer“ (parcours · wreck · course_wreck · 400 s)

- Abendrot über dem Nebelmeer (Absturz bei y −1,6), ≈ 180 m nach −Z. Abschnitte: **Anleger** (Laternenpfähle, Wimpel,
  Rettungsringe, bunte Fischkisten) → **Kippschiff 1** (mit Reling; Walzenwerfer auf dem Felsen daneben rollt Walzen
  übers Deck) → 1 m breiter **Kippsteg** → **Kippschiff 2** ohne Reling mit großem **Schubser** (bewacht seinen Platz,
  `guard`) → **Wrackfelsen** mit Warp-Box in den **Laderaum** (abseits bei x ≈ 100, y 4, Stimmung `laderaum`: Kreisgeist-Ring
  über einem Loch im Boden, gefluteter Mittelteil mit zwei Spuken und Münzen am Grund, zweiter Kreisgeist-Ring unter dem
  Querbalken, Schatzhaufen, Frachtnetze; Warp-Box hinaus) → **Checkpoint-Anleger** → drei **Kippbrücken** (1,4 / 1,2 /
  1 m) zwischen Pfahlinseln → **letztes Schiff** (20 × 8 m, drei Masten, ohne Reling) mit zwei Schubsern – beide ins
  Meer stoßen (`task` mit `reward: { reveal }`) → versteckte Warp-Box auf dem Bugfelsen → **Zielinsel** mit Leuchtturm.
- Sterne: 0 Stern-Schubser von Kippschiff 2 ins Meer stoßen (`task` mit `star`; Draufspringen federt nur) · 1 im Loch
  unter dem ersten Kreisgeist-Ring (durch die Lücke hinab, über Kisten wieder hinauf) · 2 über der letzten Kippbrücke
  (hochspringen). Stempel: im Laderaum über die Kisten auf den Querbalken über dem zweiten Ring (vom Boden aus versperrt
  der Balken).
- Extraleben: versteckter Block auf dem Wrackfelsen, Schatztruhe (`chest`) im Laderaum. Gegner: Schubser 3,
  Walzenwerfer 1, Kreisgeist-Kreis 2 (16 Glieder), Spuk 2.
- Kulisse: Felsnadeln mit Schaumkranz, Schaumsäume um alle Inseln (`brandung`), schaukelnde Bojen und Treibgut,
  Nebelschwaden, Irrlichter, Möwen, Deko-Geisterschiff und Wrackbug. Der Laderaum hat nur hinten einen Querbalken oben
  (vorn verdeckte er die Figur).

### Hilfen `_helpers_a.js`

Berg: `gipfel`, `grat`, `felswand`, `bergwiese`, `grasbueschel`, `steinpfad`, `trockenmauer`, `felsnasen`, `wasserfall`,
`almhuette`, `kuehe`, `murmeltiere`, `seilzaun`, `blumengarten`, `gipfelglueck`, `picknick`, `gipfelfahnen`,
`wimpelkette`, `vogelschwarm`, `wolkenkranz`, `seilbahn`, `glasgang` (Glasröhre als begehbarer Gang mit Decke,
`camIgnore`), `lochinsel`, `schattenNah` · Steinkreis: `wolkeninsel`, `steinkreis`, `werferlager`, `altarstein` ·
Schiffe: `holzsteg`, `kisten`, `laderaum`, `geisterlaternen`, `laternenpfaehle`, `hafenkram`, `bojen`, `nebelschwaden`,
`irrlichter`, `treibgut`, `felsnadeln`, `schatzhaufen`, `frachtnetze`.

### Test `tests/course_w6a.mjs`

Port 4640 (+ `PORT_BASE`), Aufruf `node tests/course_w6a.mjs [6-1|6-B|6-2]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,arena,shots` (je Lauf < 10 min; der Messgang `sweep` folgt der Spur von `route`),
`HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`, `TRACE=1`, `SHOTS=<Name|…>`, `DETAIL=1`, Bilder `tests/out/w6a_*.png`.
Bot mit echter Eingabe (`setInput`/`step`, Stick relativ zur Kamera-Gier); Beine u. a. `pipe` (in eine
Glasröhren-Öffnung laufen, Stick während der Fahrt – Weiche), `warp` (Warp-Box/Kanone), `clear` (Stachelkugeln abwarten),
`star` (Funkelstern), `push` (Schubser: anlaufen, seinen Stößen ausweichen, Stampfattacke, zur Schiffsmitte
zurück), `ringGap` (Lücke im Kreisgeist-Ring vorausberechnen), `stompAll`, `chaseKind`, `hop`, `crouch`. Geprüft: Laden
ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel **ohne einen Treffer-Versuch**
(6-1 ≈ 66/59 s mit fünf Schlüsselmünzen, drei Warp-Boxen, sechs Röhrenfahrten, Lücken in Kugelreihen und im
Wuschel-Kreis um Schlüssel 3 abgewartet – Bein `gap`; 6-2 ≈ 51/42 s, drei Schubser ins Meer); alle Sterne und
Stempel mit Gegenproben (Glasgang ohne Funkelstern tödlich, Stern 1 nicht beim Durchfahren, Stempel nicht von der
Terrasse, Stern-Schubser nicht durch Draufspringen, Stern 2 nicht ohne Sprung, Stempel nicht vom Boden); Extras (Weiche
links, versteckte Warp-Boxen, drei Extraleben); 6-B: Werfen und Springen der Werfer, Kampf beider Figuren (≈ 16 s),
Tod setzt zurück, Funkenblüte, Zeitlimit 100 s. Gemessen (scale 2, inkl. Schattenpass): 6-1 30–98 Zeichenaufrufe /
≤ 279 k Dreiecke (Glasgang) · 6-B 74 / 186 k · 6-2 32–75 / ≤ 202 k.

## Welt 7 – Level-Liste und Freischaltung (Hauptsitzung)

Welt 7 „Lava-Festung“ wird nach Sieg über `6-C` frei (Glasröhre `W7` auf der Welt-6-Karte, bisher „Welt 7 kommt
bald!“). Sternbedarf zählt **alle** gesammelten Sterne (Welt 1–6: 174, dazu die Halloween-Welt). Die drei Arenen liegen
als Nebenwege am Rand der Insel.

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `7-1` | parcours (Werfer-Festung: blaue Lava, Glasröhren-Netz mit H-Röhre, Feuerstäbe, Pilzlingstürme, Stampfsteine, Marschblöcke) | bluelava | course_fortfire | 3 + Stempel | Welt 7 offen |
| `7-2` | parcours (dunkler unterirdischer Tempel: Kipp-Schaltfelder machen den Weg sichtbar, Stachelpanzer, Fackeln mit Funkenblüte) | darkruins | course_switchruins | 3 + Stempel | 7-1 |
| `7-A` | arena (große Felsfläche in Lava, Lavabrocken, heller Lavafelsen-König mit Platschfischen, 200 s) | lava | course_arena | 1 | 7-1 |
| `7-3` | parcours Sprint (100 s, ≈ 450 m, Boost-Pfeile, Donut-Blöcke, Stachelwalzen, Dreifach-Gabelung) | lavarun | course_redhot | 3 + Stempel | 7-2 |
| `7-4` | parcours (blaue Lava: auftauchende Pfeilplattformen, Zylinder, rotierende Stachelwalzen, Pendelstacheln, Schubser, Knochenflieger) | bluelava | course_bluebelt | 3 + Stempel | 7-2 |
| `7-B` | arena (Käfig mit Glasröhren, blauer Schubser-Prinz mit 3 blauen Feuerbällen in einer Kurve) | fortress | course_arena | 1 | 7-4 |
| `7-5` | parcours vertikal (Turm in Lava: Stampfsteine, Knochenflieger, Seilbahn, Funkenflämmchen, 5 Schlüsselmünzen, Flucht vor Giftnebel und steigender Lava) | lavatower | course_traptower | 3 + Stempel | 7-4 |
| `7-Kapitän` | diorama (Maschinen-Diorama in Lava: Förderbänder, Stampfsteine als Trittstufen, Projektilköpfe) | lavamachine | course_diorama | 5 | 7-5 |
| `7-6` | parcours unterwasser (Rammfisch-Riff, zerbrechliche Kisten, Vulkaninsel mit Wutkaulquappen, große rotierende Rammfische) | reef | course_rammreef | 3 + Stempel | 7-5 |
| `7-C` | arena (Raum mit erhöhtem hinterem Teil, 7 Feuer-Werfer, 100 s) | fortress | course_arena | 1 | 7-6 |
| `7-7` | parcours (Vulkan-Lavasee mit steigender/sinkender Lava, Fontänenfeld mit Gitterboden, Platschfische, Lavadrachen) | volcano | course_volcano | 3 + Stempel | 7-6 |
| `7-Burg` | parcours + boss (Lava-Burg: Lavablasen, Bumerang-Werfer mit Wurfsichel, Zugbrücke per Kickbombe/P-Schalter, Klappstampfer; Boss **Baron Brummbär im Kampfwagen** auf einer Straße mit Stachelfallen und Lavalücken, 9 Treffer) | lavacastle | course_keep | 3 + Stempel | 7-7 **und ≥ 150 Sterne** |

Welt 7 hat 32 Sterne. Neu: Power-up **Wurfsichel** (Bumerang, sammelt Münzen ein), Feuerstab, Lavablase, auftauchende
Pfeilplattformen, Zylinder, rotierende Stachelwalzen, Pendelstachel, steigende/sinkende Lava, Lava-Fontänen, Gitterboden,
Giftnebel-Flucht, Klappstampfer; Gegner Knochenflieger, Platschfisch, Lavadrache, Wutkaulquappe, Funkenflämmchen,
Stachelpanzer (vorhanden prüfen); Varianten heller Lavafelsen-König, blauer Schubser-Prinz; Boss Baron Brummbär im
Kampfwagen (wirft Kickbomben – zurückkicken –, spuckt Feuer; Wurfsichel macht Zusatzschaden).

## Präzisierung (Level 6-5, 6-6 und 6-Haus)

Additiv zur Welt-6-Liste: Titel und Besonderheiten der Level 6-5, 6-6 und 6-Haus. Dateien `src/course/levels/w6/6-5.js`,
`6-6.js`, `6-Haus.js`, eigene Hilfen `src/course/levels/w6/_helpers_c.js` (kein `LEVEL`, nur für diese drei Level; nutzt
die Welt-4-Hilfen `w4/_helpers_d.js` mit), Test `tests/course_w6c.mjs`. Kein Motor-Code geändert; alle Sonderteile sind
level-lokal (Hilfsdatei, Haken `LEVEL.build`/`LEVEL.setup`, `level.onStep`).

### 6-5 „Pustewind am Eisgipfel“ (parcours · snowwind · course_snowwind · 400 s)

- Verschneite Gipfel über dem Wolkenmeer, ≈ 270 m nach −Z, hinab (y 0 → −10,5) und per Glasröhren wieder hinauf (y 4).
  Abschnitte: **Schneestart** (Iglu, Skihütte, Holzzaun, Schneemann, Schlittschuh; Treppe ?-Block → versteckter Block →
  ?-Block; rechts die Rampe zur Stachelplattform) → **Eissee** (16 × 40 m, Eisläufer-Pilzlinge, Schneeufer statt Eiskante,
  Laternen) → **Pustewolken-Hang** (drei Hangstücke mit Absätzen, Slalomstangen; vier Pustewolken ≈ 1,4 m über dem Weg
  pusten quer, Schneewälle mit Lücken dort, wohin sie pusten) → **Glasröhre 1** hinab → **zweiter Eissee** (Checkpoint,
  Schlittschuh, Pustewolke; rechts die Stachelbrücke zur Rätselbox) → **windiger Abgrund** (vier Schneeschollen 5,2 m breit,
  Lücken 5,5 m; zwei quer blasende Windböen `windfeld` strength 9, period 4,2 / on 1,6 / warn 1,0 mit Windfahnen; über der
  dritten Lücke ein Aufwind `dir [0, 1, 0]` strength 10; Checkpoint 2 auf der vierten Scholle) → **Glotzfisch-Bucht** (sechs
  Eisschollen im Wasser, je ein Glotzfisch quer über jeder Lücke, Löcher y = Wasseroberfläche mit Eisring) → **Glasröhre 2**
  hinauf → **Gipfel** (Zielmast, Wimpel, Kiefern).
- Pustewolken nur am Hang und am zweiten Eissee, nie über den Windböen-Abgründen (Hinweis „Hinweise für Level-Bauer“).
- Sterne: 0 hoch über der Start-Treppe – den **versteckten Block** (Unterkante 4,0 m, vom Boden erreichbar) von unten
  aufdecken, dann ?-Block (Oberkante 4) → versteckter Block (5) → ?-Block (8,2) → Stern (11,4); ohne den versteckten Block
  reicht der Sprung vom ersten ?-Block nicht · 1 Rätselbox hinter der **Stachelbrücke** (nur mit Schlittschuh unverletzt)
  → Schlittschuh-Bahn bei x 90: Eisfläche 34 × 34 m, Schneeinsel in der Mitte, **Stachelrahmen** (4 × `stachelboden`)
  ringsum; Zeitring auf dem Rahmen startet acht blaue Münzen auf einem Kreis r 6,9 m (ganz auf den Stacheln) in 10 s →
  Stern auf der Insel · 2 im **Aufwind**: während der Böe in die dritte Lücke springen, er trägt ≈ 6 m hoch zum Stern,
  dann auf die vierte Scholle; in der Ruhe reicht der Sprung nicht. Stempel: **Stachelplattform** am Start (12 × 12 m) –
  mit Schlittschuh die Rampe hinauf und über die Stacheln (Rampe bündig mit der Stachel-Oberkante 1,25 m).
- Extraleben: der versteckte Block an der Treppe (1-up). Checkpoints: zweiter Eissee, vierte Scholle. Gegner: Pustewolke 5,
  Glotzfisch 5, Eisläufer-Pilzling 3; Schlittschuhe 3 (Start, Checkpoint, Bahn; `respawn`).
- Budget: `eisflaeche` mit `edge: false` (die Eiskante kostet ≈ 110 k Dreiecke je See), niedrige Schneeufer (`bank`)
  als Rand; Kulisse verschmolzen (`LEVEL.build`): Slalomstangen, Zäune (mit Kollision), Skihütte, Eiszapfen an allen
  Schollen, Eiskristalle, Eislöcher, Wimpelketten.
- `rampenKameraFrei(level)`: `CollisionWorld.raycast` prüft Rampen als ganzen Hüllquader – an Hängen rückte die Kamera
  bis auf 3 m heran (Blick über die Schräge). Der Haken setzt `camIgnore` auf allen Rampen dieses Levels.

### 6-6 „Kanonenturm im Wolkenwerk“ (parcours · factory · course_factory · 500 s)

- Senkrechte Maschinenhalle in den Wolken, Höhen 0 → 14 → 20 → 30 → 34 → 44 → 54 → 59, ≈ 225 m nach −Z. Abschnitte:
  **Werkstor** (Kessel, Schlot, Rohre, Schaltpult) → **Kletterwand** (`klettergitter` an einem 14 m hohen Maschinenblock,
  `wall: false`; Projektilkopf-Kanone am Pfeiler daneben) → **Schlot** mit senkrechtem Stufen-Förderband (`foerderband`
  `mode: 'wand'`, `ledges` 2,2) → **Wolken** (feste und pendelnde `wolkenplattform`) → **Deck C1** mit Gegenband
  (Pilzlinge reiten mit) und Kanone, **Aufzugsband** (Wand-Förderband mit Stufen) → **Deck C2** mit Querband,
  verschwindende Wolken → **Warp-Box** (einziger Weg zum Checkpoint-Deck) → **Checkpoint-Deck** mit Rätselbox →
  **Kanonen-Floß** (`vehicle` `mode: 'once'`, fährt erst, wenn eine Figur darauf steht; drei mitfahrende Kanonen schießen
  Projektilköpfe nach +Z der Figur entgegen) → **obere Wolken** → **Riesenkanone** (`riesenkanone` `hidden`, schießt
  Riesenprojektile über die Lücke – draufspringen und mitfahren) → **Förderband-Turm** (Deck mit Krallen-?-Block und
  Krallen-Automat; drei Bandwände ohne Stufen nur mit **Krallen-Anzug** zu erklimmen, Terrassen 44/54; Kanone auf
  Terrasse 1) → **Ziel** (y 59, Zielmast).
- Sterne: 0 oben auf dem Schlot (Stufen-Förderband hinauf, höchster Punkt des ersten Abschnitts) · 1 Rätselbox →
  Förderband-Raum (x 80): Zeitring, acht blaue Münzen rund um ein **Rundband** (`mode: 'rund'`, Mitnehmer tragen über
  die Oberseite) in 10 s; Stern versteckt bis zum Erfolg · 2 linkes Stufen-Förderband am Turm (14 m) hinauf, über den
  roten Steg nach rechts. Stempel: auf dem Ziel-Deck von einem **Ziegel** auf dem Sockel hochspringen (zerstampft man den
  Ziegel, reicht der Sprung vom Sockel nicht).
- Extraleben: versteckter Block über dem Aufzugsband (Deck C2). Checkpoints: Checkpoint-Deck (nur per Warp-Box),
  Turm-Deck. Gegner: Projektilkopf-Kanone 7 (davon 3 auf dem Floß), Riesenkanone 1, Pilzling 4.
- Hilfen: `startBeimDraufstehen(level, id)` (Fahrzeug `delay` = ∞, bis eine Figur auf seinem `mover` steht; Neustart
  setzt zurück), `krallenAutomat(level, { pos })` (legt einen Krallen-Anzug aus, wenn die Figur keinen hat und keiner
  in 3 m liegt – nach Verlust immer Nachschub), `traeger` (Fachwerkträger), `zahnraeder`, `dampf`. Wand-Förderbänder
  0,12 m vor die Turmfront gesetzt, damit die Kralle die Bandfläche statt der Insel trifft.
- Kulisse verschmolzen: rote Träger mit Signallampen, Warnstreifen, Nieten, bunte Kisten/Fässer (mit Kollision),
  Schaltpulte, Turmfassaden mit Fenstern, rot-weiß geringelte Werksschlote im Wolkenmeer, Wimpel, rotes Floß.

### 6-Haus „Haus Volltreffer“ (house · house · course_house · 5 Räume à 10 s, `fail: 'exit'`)

- Prüfungs-Haus mit **Wurfbällen** (14, je mit `roomId`), fünf Räume nach −Z (je 64 m Abstand), jeder mit eigener Tapete
  (`tapete`: kugeln, theater, sterne, zoo, kirmes), Bildern, Uhren, Möbeln. Räume (Ziel):
  1. **Kullerbahn** (reach) – vom Balkon den Ball in die Rinne werfen; eine Klappwand fängt zu hohe Würfe, die Rinne
     (`kullerRinne`: Hangbeschleunigung und Zentrierung des Balls, weil der Wurfball nur am Boden beschleunigt) führt durch
     den **Mäusetunnel** ins **Mauseloch** (0,56 m hoch – die Figur passt auch geduckt nicht) in die Stube des
     Mäusehauses auf den Stern; Glas darüber, Bällebad links und rechts.
  2. **Bühne frei** (reach) – Kraftfeld, Orchestergraben, rote **Hebebühne** trägt den Stern (`sternFolgt`): werfen,
     wenn sie oben ist; Vorhänge, Scheinwerferkegel.
  3. **Sprungfeld** (reach) – Trampolin vor dem 12 m hohen Kraftfeld, dahinter ein Ringelturm mit **Druckschalter**
     oben: im Scheitel des Trampolinsprungs den Ball von oben auf den Schalter werfen → der Stern erscheint über dem
     Trampolin (`sternVersteckt`), Münzsäule.
  4. **Pilzling-Gehege** (defeatAll) – sechs Pilzlinge in der Grube hinter dem Kraftfeld, **POW** auf einem gelben
     Sockel: Ball auf den POW werfen.
  5. **Schießbude** (reach) – Bühne mit fünf Bällen auf einem Tablett, fünf **Zielscheiben** (`zielscheibe` group
     `ziele5`, `onAll` → Stern auf der Bühne); alle fünf in 10 s treffen.
- **Kraftfeld** (`kraftfeld`): Kasten mit `solid: true, trigger: true` (+ `camIgnore`, `noWallSlide`) – die Figur stößt
  an, der Wurfball ignoriert `trigger`-Formen und fliegt hindurch; flimmernde Wabenfläche und Schild „NUR BÄLLE!“ seitlich.
- `raumHaken` setzt beim Raumstart Zielscheiben und Druckschalter zurück; Zeitablauf verlässt das Haus mit den
  bisherigen Sternen.

### Test `tests/course_w6c.mjs`

Port 4660 (+ `PORT_BASE`), Aufruf `node tests/course_w6c.mjs [6-5|6-6|6-Haus]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,shots,haus,haus-extra` (je Lauf < 10 min), `HEROES=lotti,greta`, `ONLY=<Text>`,
`VERBOSE=1`, `SHOTS=<Name|Name>`, `DETAIL=1`, `RAUM=n`, Fehlersuche `PARTS=probe FROM=… LEGS=… TRACE=1`; Bilder
`tests/out/w6c_*.png`. Bot mit echter Eingabe; Beine u. a. `fence` (Klettergitter, wartet, bis ein Projektilkopf vorbei
ist), `lift` (Stufe des Wand-Förderbands abpassen), `ride` (Floß, Köpfen ausweichen), `bullet` (Anlauf, auf das
Riesenprojektil springen), `climb` (Krallen), `cleat` (Mitnehmer des Rundbands), `circle` (Kreisfahrt auf dem
Schlittschuh, Radius geregelt), `waitWind` (Böe abwarten bzw. `waitFor: 'boe'`), `fishFree` (kein Glotzfisch lugt oder
springt in der Nähe), `vmax` (Schlittschuh-Tempo begrenzen), `straight` (Stick stur geradeaus: „naiver“ Sprung); Haus-Bot
(Ball greifen, ausrichten, werfen; Hebebühne oben abpassen; Trampolin-Scheitel; fünf Scheiben).
Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel **ohne Treffer**
(6-5 ≈ 49 s mit zwei Glasröhren und drei abgewarteten Windlücken; 6-6 ≈ 63 s mit Klettergitter, Aufzugsband, Warp-Box,
Floß, Riesenprojektil, drei Bandwänden mit Krallen); alle Sterne und Stempel mit Gegenproben (ohne versteckten Block,
ohne Schlittschuh verletzen die Stacheln, ohne Aufwind, ohne Aufzugsband, Zeitablauf der Rätselbox, ohne Ziegel,
Bandwand ohne Krallen, Checkpoint-Deck nicht per Weitsprung, Böe verweht den naiven Sprung); Extraleben, Checkpoints;
6-Haus: alle fünf Räume je < 10 s (Lotti und Greta, ≈ 5,5 / 3,7 / 3,2 / 1,7 / 4,3 s), Ergebnis 5/5 gespeichert,
Gegenproben (Mauseloch, Kraftfelder halten die Figur auf, Wurf bei unten stehender Bühne verfehlt, Stern 3 versteckt bis
zum Schalter, Zeitablauf → Haus verlassen mit 2 von 5 Sternen). Gemessen (scale 2, inkl. Schattenpass): 6-5 Messgang
≤ 54 Zeichenaufrufe / ≤ 148 k Dreiecke · 6-6 ≤ 84 / ≤ 148 k (Bilder an den Stern-Zielen bis 90 / 166 k) · 6-Haus je Raum
27–44 / ≤ 111 k.
Wünsche an den Motor: `CollisionWorld.raycast` für Rampen genau (statt Hüllquader; dann entfällt `rampenKameraFrei`),
günstigere Eiskante für große `eisflaeche`, Wurfball-Hangbeschleunigung auch in kurzen Luftphasen (dann entfällt
`kullerRinne`).

## Präzisierung (Level 6-7, 6-Panzer und 6-C)

Additiv zur Welt-6-Liste: Titel und Besonderheiten der Level 6-7, 6-Panzer und 6-C. Dateien `src/course/levels/w6/6-7.js`,
`6-Panzer.js`, `6-C.js`, eigene Hilfen `src/course/levels/w6/_helpers_d.js` (kein `LEVEL`, nur für diese drei Level; nutzt
lesend die Welt-2-Kolonne `w2/_helpers_d.js` – `panzerSetup` – und den Welt-3-Zirkus `w3/_helpers_e.js` – `cutawayTent`,
`circusArena`, `circusProps`, `grandStairs`), Test `tests/course_w6d.mjs`. Kein Motor-Code geändert; alle Sonderteile sind
level-lokal (Hilfsdatei, Haken `LEVEL.prebuild`/`LEVEL.build`/`LEVEL.setup`, `level.onStep`, `view.onFrame`).

### 6-7 „Wuschelflucht im Glitzerschacht“ (autoscroller · fuzzymine · course_fuzzymine · 400 s)

- Senkrechter Schacht (x −8 … 8, 78 m hoch) mit Felswänden aus Buckelfels (bunte Kristalladern), Gerüstbrettern (Einweg),
  unsichtbarer Glaswand vorn; das Bildfenster fährt nach oben (`scroll.path` senkrecht, `frame.backMode: 'kill'`, Tempo-
  Tabelle: an der Mittelstation und im Quetschgang gemächlich), sobald die Heldin die Sohle verlässt (`trigger`). Die
  **Wuschel-Horde** folgt dem Bild (`follow: 'scroll'`, `behind` 5,2). Abschnitte: Sohle → erste Bretter (seitlicher
  Quetschblock) → drei Puffwolken → **Mittelstation** (Kontrollpunkt) → **Quetschgang** (drei Quetschblöcke im Wellentakt)
  → Sprungfelder und fahrende Goldwolke → Puffwolken → Felssims → Schachtkrone (schwebende Wolke) → **Wippen-Galerie**
  (horizontal, y 78; Kontrollpunkt, drei Wippen, Galerie-Horde rollt langsam nach) → **Grubentor** (öffnet sich, wenn man
  davor steht) → Holzdeck mit Zielmast und Himmelsfenster.
- `wippenStoss`: der Quetschblock über Wippe 3 (Modus `signal`) stößt erst, wenn jemand auf der Wippe steht, und schleudert
  das nahe Ende hoch (Stern 2). `schachtAbsturz`: nach der Fahrt = Absturz unter der Galerie. `glitzerThema` (hellere
  Variante von fuzzymine, `LEVEL.prebuild`), Lichterketten und Wimpel, Staubflocken im Schacht.
- Sterne: 1 unter dem grauen Wolkenbausch auf dem linken Felssporn (gleich nach dem Stempel) · 2 über Wippe 3 (nur vom
  hochgeschnellten Ende) · 3 in der **Felsrille** hinter der Quetschblock-Wand (unter drei Quetschblöcken hindurch).
  Stempel: Nische am Start hinter dem Quetschblock. Extraleben: unsichtbarer Block über der Sohle, Kiste in der Felsrille
  (Stampfattacke). Gegner: Wuschel-Horde 2, Wuschel 4.

### 6-Panzer „Kawumm-Kolonne über den Wolken“ (autoscroller + boss · skyway · course_tank · 400 s)

- Vierzehn Panzer (`vehicle` style 'tank', Modell panzer_fahrzeug) rollen mit 3,2 m/s auf einer Wolkenstraße (nur Optik,
  `killY` −4); das Bildfenster gleitet mit 6,0 m/s an der Kolonne entlang. `kolonnenFahrplan` (Mathematik wie
  `ScrollWindow`) plant **Haltepunkte**, an denen das Fenster genau mit der Kolonne fährt: T3 18 s, T8 8 s, T9 7 s; am Ende
  halten Fenster und Panzer gemeinsam über dem Kommandopanzer (`scroll.speeds`, `vehicle.stop`). Konvoi-Koordinate c wie
  2-Panzer (`kP`, `aufPanzer`, `LEVEL.convoy`, `LEVEL.plan`).
- `kolonnenSetup` = Welt-2-Haken `panzerSetup` (Mitfahr-Regeln, Luke, Holzwand, Wimpel; ohne Wüsten-Abendrot) plus:
  Werfer mit `ride` tänzeln um einen mitfahrenden Platz, Zündköpfe über einem Deck fahren mit, **Stampfattacke über einem
  fahrenden Panzer fährt mit der Kolonne** (der Motor hält die Figur beim Stampfen waagerecht an), Zündkopf-Tipp beim
  ersten Aufheben. Kulisse: Wolkenstraße mit Pastell-Flecken und Wolkenwülsten, Festschmuck (geringelte Masten mit
  Wimpelketten alle 16 m), Heißluftballons, Schwebeinseln, Wolkenberge, Wolkenburg mit vier Türmen um die Arena,
  Regenbogeninsel.
- Abschnitte: T1 Abfahrt (Wolkenbahnhof, ?-Block Funkenblüte) → T2 erster Zündkopf-Spender, Steinblöcke → **T3 Turm-
  Panzer** → T4L/T4R Doppelreihe (Feuer-Werfer) → T5 Kontrollpunkt (?-Block Krallen-Anzug) → T6 Steinblock-Pyramide → T7
  Hammer-Werfer → **T8 Schatz-Panzer** → **T9 Stampf-Panzer** → T10/T11 Werfer (Podest) → T12 → **Kommandopanzer** (Luke →
  Arena) → Wolkenburg-Arena (Rundkäfig r 10,5, `wirbelbrocken` mit `decoys: true`) → Warp-Box → Regenbogeninsel (seitlich,
  eigene Kamera-Schiene `area`).
- Sterne: 1 T3 drei große ?-Blöcke (`riesenfrageblock`, nur `bomb`) mit Zündköpfen sprengen – sie wachsen zu einer Treppe
  (Oberkanten 5,0 / 7,6 / 10,2 m), der dritte zeigt den Stern (`onGrow: { reveal }`) · 2 T8 Steinblock auf dem Goldsockel
  sprengen (`beiZerstoerung` → `reveal`) · 3 T9 großen ?-Block (nur `pound`) stampfen – er trägt die Heldin 7 m hinauf
  durch eine Münzsäule zum Stern. Stempel: Kammer vor der Luke des Kommandopanzers, Baron-Holzwand sprengen. Extraleben:
  oberster Steinblock der Pyramide (T6), verborgener Block über T12. Gegner: Marschblock 15, Zündkopf (endlos aus 6
  Spendern, `behavior: 'walk'`), Feuer-Werfer 2, Hammer-Werfer 2, Wirbelbrocken.

### 6-C „Glibber-Gala im Wolkenzirkus“ (boss · circus · course_bossblob · 400 s, 2 Sterne + Stern der Würfelblase)

- Nacht über den Wolkeninseln (`sternenhimmel` mit Mond, Lichterketten, Scheinwerfer): **Wolkenvorplatz** (roter Teppich,
  Kassenhäuschen, Zirkuswagen, Plakat „Glibber-Gala“, Kanone, Ballons) → **Spiegelbühne** (schwebende Bühne 11 × 33 m mit
  Zerrspiegeln, zwei ?-Blöcke mit Spiegelfrucht, Gelee-Brocken) → Prachttreppe → Talstation (Kontrollpunkt) → **Seilbahn**
  (28 m über der Wolkenschlucht zum Zeltplateau y 8; `gondelRuf` holt die leere Gondel zurück) → Zeltplateau (Kontrollpunkt,
  Torbogen) → **Manege** (Zelt aufgeschnitten wie 3-B, Bande r 12,3 mit Tor, Publikum jubelt bei Treffern, `wuerfelblase`
  mit `star: { index: 2 }`) → Warp-Box → Hinterhof mit Riesenrad, Feuerwerk und Zielmast.
- Sterne: 1 **Zwei-Figuren-Feld** (`pfeld` need 2) – mit dem Spiegelfrucht-Klon zu zweit darauf → Stern auf der Trommel ·
  2 **Sternschaukel** neben der Seilbahn – aus der fahrenden Gondel seitlich abspringen, zurück über drei Wolken zum
  Zeltplateau · 3 Würfelblase. Stempel: **Artistenpodest** auf dem Vorplatz (Sprungtrommel `trampoline` strength 19).
  Extraleben: verborgene Blöcke über der blauen Trommel und über der mittleren Wolke. Gegner: Gelee-Brocken 5 (silbern,
  ohne Boss), Würfelblase.

### Test `tests/course_w6d.mjs`

Port 4670 (+ `PORT_BASE`), Aufruf `node tests/course_w6d.mjs [6-7|6-Panzer|6-C]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,shots` (je Lauf < 10 min), `HEROES=lotti,greta`, `ONLY=<Text|Text>`, `VERBOSE=1`,
`SHOTS=<Name|Name>`, `DETAIL=1`, `TRACE=<Bedingung>`; Bilder `tests/out/w6d_*.png`. Bot mit echter Eingabe (Figur auf der
Route unverwundbar, Trefferversuche werden gezählt). 6-7 und 6-C: Beine wie in den Welt-5-Tests (`to`/`jump`/`jumpAt`,
`bounce`, `crusher`, `mover`, `wippeStern`, `pound`, `backflip`, `gondelSprung`, `blase` – Würfelblase: ausweichen, über
Schockwellen springen, im Fliehen auf den Hut, `warp`). 6-Panzer: Konvoi-Bot `window.__k` (Spur über die fahrende
Kolonne, Lücken springen, `bomb` – Zündkopf holen, ausrichten, werfen –, `hop`, `pound`, `luke`, `boss` – Wirbelbrocken:
Attrappen und Original ausweichen, im Schwindel auf das Original –, `holds`). Geprüft: Laden ohne Konsolenfehler,
Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start → Zielmast; alle Sterne und Stempel mit beiden Heldinnen samt
Gegenproben (6-7: Stern 1 nicht von der Sohle, Stern 2 nicht ohne Quetschblock; 6-Panzer: Stampfen lässt die
Explosions-Blöcke kalt, Stampfen bricht den Steinblock nicht, Zündkopf lässt den Stampf-Turm kalt; 6-C: Feld nicht allein,
Stempel nicht ohne Sprungtrommel); Extraleben, Kontrollpunkte (auch auf dem fahrenden T5), Absturz, Horde, Quetschblock,
Zündkopf-Explosion, Halte des Bildfensters, Werfer auf dem Panzer, Gondel-Rückruf; Messgang und Bilder.
Gemessen (scale 2, inkl. Schattenpass): 6-7 Route ≈ 97 s (Lotti/Greta, ohne Treffer), Messgang ≤ 94 Zeichenaufrufe /
≤ 220 k Dreiecke, Bilder 34–88 / ≤ 220 k · 6-Panzer Route ≈ 144 s (Halte des Fensters 17,6 / 7,6 / 6,6 s), Messgang
≤ 86 / ≤ 225 k, Bilder 47–110 / ≤ 261 k (am teuersten: oben auf Turm C mit Blick über die Kolonne) · 6-C Route ≈ 89 s,
Messgang ≤ 75 / ≤ 142 k, Bilder 38–74 / ≤ 151 k. Hinweis: die Trefferversuche im Bosskampf zählen jeden Berührungsschritt
der unverwundbaren Bot-Figur (Fäuste der Attrappen, Riese), nicht einzelne Treffer.

## Präzisierung (Level 6-3, 6-4 und 6-A)

Additiv zur Welt-6-Liste: Titel und Besonderheiten der Level 6-3, 6-4 und 6-A. Dateien `src/course/levels/w6/6-3.js`,
`6-4.js`, `6-A.js`, eigene Hilfen `src/course/levels/w6/_helpers_b.js` (kein `LEVEL`, nur für diese drei Level; nutzt
`Bld`, `litTop`, `gradY`, `onRespawn` aus `w5/_helpers_b.js` und `schattenDiaet` aus `w5/_helpers_a.js`), Test
`tests/course_w6b.mjs`. **Kein Motor-Code geändert**; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.prebuild`/`build`/`setup`). Gegner nach „Präzisierung (Gegner Welt 6)“, Bausteine nach „Präzisierung (Motor und
Bausteine Welt 6)“. Eigene Fantasie-Gestaltung (Papierwände, lackierte Pfosten, geschwungene Dächer, Ruinen) ohne reale
religiöse Symbole und ohne fremde Namen oder Figuren.

### 6-3 „Schiebetüren im Kirschblütensaal“ (parcours · fareast · course_fareast · 400 s, frei nach 6-2 und ≥ 110 Sternen)

- Rosiger Morgen, fallende Kirschblüten, ≈ 150 m nach −Z. Abschnitte: **Hof und Korridor** (z 12 … −28; Koi-Teich,
  Steinlaternen, Lichterkette; drei Schiebetüren quer über den Gang – antippen bzw. Aktionstaste –, links eine Tür vor
  einer bemalten Wand mit Münzen, rechts die **Maskennische** mit Papierwänden und Teppich, am Ende die rote Röhre) →
  **Kirschblütensaal** (z −29 … −54, drei Stockwerke im Querschnitt, vorn offen: die Decken samt Brüstung werden
  durchsichtig, wenn sie die Figur verdecken – eigenes `view.xray`-Netz je Decke mit Läufer; Erdgeschoss nach rechts mit
  Maskensockel am Eingang, Pilzling, Rollpilz, Krallen-Pilzling; Treppe; 1. Stock nach links mit zwei Stachelwerfern und
  einem Pilzling; Treppe; 2. Stock nach rechts mit Türenreihe, **Gong** und Warp-Box) → **Tempelaußenseite** (z −68 …
  −128: Ankunftsterrasse mit Checkpoint, 6 m breiter Dachfirst mit drei Stampfsteinen abwechselnd links/rechts,
  Helm-Station mit zwei **Propeller-Helmen** (kommen nach 3 s wieder), 8-m-Lücke, mittleres Dach mit rosa Wolke) →
  **Oberstes Dach** (z −128 … −148: zwei Dachstufen, Zielmast vor einem Pavillon).
- **Pilz-Maske** (Sockel am Saaleingang, Nische im Korridor): zugewandte Gegner sehen die Figur nicht (Stachelwerfer
  werfen nicht, Krallen-Pilzlinge springen nicht, der Pilzling jagt nicht). Beim Warp auf die Tempelaußenseite fällt sie
  ab (Hinweis-Banner), damit dort der Propeller-Helm passt.
- Sterne: 0 hinter Tür 2c des 2. Stocks zwei **Scheinwände** (bemalte Wände, antippen bzw. Aktionstaste, gleiten nach
  unten; erst die zweite gibt den Stern frei) · 1 hoch über der 8-m-Lücke (nur mit Propeller-Helm; Weitsprung reicht
  nicht) · 2 Gong im 2. Stock schlagen (antippen, Kopfsprung oder Angriff: Münzregen im Radius 2,6 m und die versteckte
  **Rätselbox** erscheint) → Käfig mit Stachelwerfer (Nebenbereich x ≈ 100, roter Läufer, Blumenkästen) besiegen (`task`
  mit Stern). Stempel: auf der rosa Wolke über dem mittleren Dach (nur mit Propeller-Helm erreichbar).
- Geheimnisse: fünf **Schlüsselmünzen** auf den Dächern (Inselecke, unter Stampfstein 1, Ecke des mittleren Dachs,
  Dachstufe 2, oberstes Dach) öffnen die versteckte Warp-Box neben dem Pavillon → **Gong-Garten** (x ≈ 100, Koi-Teich,
  vier bunte Gongs mit Münzregen, **goldener Gong → Extraleben**, Warp-Box zurück). Extraleben auch im ?-Block der Nische
  hinter einer Tür im 1. Stock.
- Gegner: Pilzling 3, Rollpilz 2, Krallen-Pilzling 2, Stachelwerfer 3 (einer im Käfig), Stampfstein 3; Pilz-Maske 2,
  Warp-Boxen 5.
- Budget: Saalwände und Innenausbau ohne Sonnenschatten, Schiebetüren ohne Schatten, ihr Antipp-Schein leuchtet nur am
  eigenen Stockwerk, Türen tieferer Stockwerke zeichnen nicht (von oben verdeckt), `schattenDiaet` für die Saal-Gegner,
  eigene leichte Dächer (Drehkörper) und Laternen statt Registry-Kulisse. Kameraschienen: Korridor, Saal (Neigung 28°,
  Abstand 15), Tempel, Käfig, Gong-Garten.

### 6-4 „Floßfahrt durch den Giftsee-Dschungel“ (parcours · jungle · course_jungle · 400 s)

- Lila Giftsee im Dschungel, ≈ 300 m nach −Z. Abschnitte: **Startufer** (Hütte, Lianen-Kletterwand zum Aussichtsfelsen,
  Steg) → **Floßstrecke I** (z −8 … −96; Floß 1 legt ab, sobald man draufsteht, ≈ 92 m zwischen Wurzelinseln, vier
  Brummer kreisen über dem Weg; Abzweig: unter dem Lianen-**Deckengitter** vom Floß hochspringen, hinüberhangeln zur
  **Tor-Insel** mit dem blauen Tor und der **Glasröhre** hinauf zum Baumhaus; eine zweite Röhre führt vom Baumhaus zur
  Checkpoint-Insel und zurück) → **Checkpoint-Insel** (z −97 … −114, Checkpoint, Sternenring) → **Floßstrecke II**
  (z −114 … −204, Floß 2, sechs Rankenschnapper wachsen aus dem Gift über den Weg) → **Abwärtsströmung** (z −204 … −244:
  dasselbe Floß saust die 40 m lange Giftschlucht 4 m hinab; Giftwasserfälle, Moospolster und Lianen an den Kanten) →
  **Landeinsel** (End-Warp-Box, kletterbare Felswand) → **Ruinenplateau** (z −278 … −304, per Warp-Box: Säulen,
  Steinfrösche, Ruinenmauer mit Moos und Lianen, Zielmast).
- Flöße (`floss`) warten ohne Figur und liegen nach einem Absturz wieder am Start. Der Horizont-See des Himmels liegt
  tiefer (`prebuild`: `sky.theme.seaLevel = −7`), damit die untere Landeinsel nicht unter der Kulisse verschwindet.
- Sterne: 0 im **Baumhaus** (nur über Deckengitter → Tor-Insel → Glasröhre; Sprung am Stamm reicht nicht) · 1
  **Sternenring** auf der Checkpoint-Insel (acht Sternmünzen in 15 s, vier davon auf Baumstümpfen im Gift) · 2 auf dem
  Sims über der **Felswand** neben der End-Warp-Box (Kletterranke; Sprung daneben reicht nicht). Stempel: oben auf dem
  Querbalken des **blauen Tors** (Kletterranke am linken Pfeiler).
- Extraleben: ?-Block auf dem Aussichtsfelsen (Kletterwand), unsichtbarer Block auf der Tor-Insel. Gegner: Brummer 4,
  Rankenschnapper 6.
- Kulisse: Riesenbäume, Farne, leuchtende Pilze, Giftblüten, Seerosen mit Lotusblüten, **Schilf mit Rohrkolben** am
  Floßweg (frei von Inseln und Rankenlinien), Glühwürmchen. Wand-Klettergitter ohne Sonnenschatten.

### 6-A „Schubser-Prinz im Röhrenzwinger“ (arena · fortress · course_arena · 300 s, 1 Stern)

- Festungshof mit Zwinger (20 × 20 m, Goldgitter, Kronen-Mosaik in der Mitte, Wappen über den Röhrenmündungen), je drei
  **Glasröhren-Mündungen** in der linken und rechten Wand (z −6 / 0 / 6), hinter dem Zwinger verschachtelte Schleifen wie
  im Testlevel 0-25; vorn das **Kronentor** (schließt sich beim Betreten), Zuschauertribünen, Fackeln, Wimpel.
- Kampf (`prinzKampf`, Arena-Anpassung: der Boss zählt als Gegner der Arena, Lebensleiste, Tor-Sperre): Der Prinz nimmt
  Anlauf auf die Figur; wer vor einer Mündung seitlich ausweicht, lässt ihn sich darin festrammen, ein Stoß schiebt ihn
  durch die Röhre, er kommt benommen aus der Gegenmündung – dann ein Tritt von oben. Drei Tritte → Sieg, Stern in der
  Mitte. Draufspringen ohne Röhre ist nur ein Abprall. Tod: Neustart vor dem Tor, Prinz wieder 3/3, Tor offen.
- ?-Block (5 Münzen) und Münzblock vor dem Tor, unsichtbarer Block rechts davor (Extraleben). Kamera: feste Schiene
  (Neigung 52°, Abstand 24), sanfter Arena-Zug (`camPull` 0,18), damit der Start vor dem Tor im Bild bleibt.

### Hilfen `_helpers_b.js`

Allgemein: `isl`, `line`, `ring`, `arc`, `column`, `sign`, `glimmer` (Glühpunkte als `Points`, mit Begrenzungskugel) ·
Fernost: `doorWall` (Papierwand mit Türöffnungen und Kollision), `nische`, `saalDecke` (Durchsicht-Decke mit Brüstung
und Läufer), `bruestung`, `treppe`, `scheinwand` (bemalte Wand: antippen/Aktion, gleitet nach unten, `onOpen`),
`saalZier`, `daecher`, `laternen`, `zier` (Trommel, Schirm, Kübel, Bonsai, Teich mit Koi, Lichterkette, Moos, Steine,
Fahne, Bank, Blumen, Hütte, Stamm) · Dschungel: `seerosen`, `schilf`, `moospolster`, `blauesTor`, `baumhaus`, `felsen`,
`ruinen` · Arena: `zwinger`, `prinzKampf`.

### Test `tests/course_w6b.mjs`

Port 4650 (+ `PORT_BASE`), Aufruf `node tests/course_w6b.mjs [6-3|6-4|6-A]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,shots` (je Lauf < 10 min), `HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`,
`SHOTS=<Name|…>`, `DETAIL=1`, Bilder `tests/out/w6b_*.png`. Bot mit echter Eingabe (`setInput`/`step`, Stick relativ zur
Kamera-Gier); Beine u. a. `tap` (Bildschirm-Tipp auf die Zielmitte nach `snapCamera`), `action`, `pound`, `stompAll`
(Liste von Ids; Rollpilz per Stampfattacke; `lineUp`: Stachelwerfer zugewandt von vorn anspringen, ohne seine Mitte zu
überqueren – die Pilz-Maske wirkt), `board`/`raft` (Floß; Brummer-Sturzflug und Rankenköpfe werden vorausberechnet, die
Figur weicht auf dem Floß aus), `hang`, `climb`, `prop` (Propeller-Helm), `fight` (Schubser-Prinz), `chaseKind`, `star`.
Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel **ohne einen
Treffer-Versuch** und ohne Fehler im Protokoll (6-3 ≈ 63/56 s mit Pilz-Maske, Gegnern im Saal von oben, Propeller-Flug;
6-4 ≈ 84/83 s, beide Floßstrecken samt Abwärtsströmung; 6-A ≈ 33 s, drei Röhrenfahrten und drei Tritte); alle Sterne
und Stempel mit Gegenproben; Extras (Türen per Aktionstaste, Maskennische, Maske gegen Stachelwerfer mit Gegenprobe,
Münzregen, fünf Schlüsselmünzen → Gong-Garten, Checkpoint, Floß wartet und kehrt nach Absturz zurück, Rückweg-Röhre,
Tor-Sperre, Abprall ohne Röhre, Tod setzt den Kampf zurück, fünf Extraleben). Gemessen (scale 2, inkl. Schattenpass,
Messgang alle ~7 m der Route und Bilder je Abschnitt): 6-3 32–106 Zeichenaufrufe (Saal, 1./2. Stock; je nach Gegnerstand
einmal 112 gemessen; Figur ≈ 20) / ≤ 218 k Dreiecke · 6-4 ≤ 84 / ≤ 285 k (Deckengitter samt Schatten ≈ 86 k) · 6-A ≤ 71 / ≤ 237 k.

## Präzisierung (Motor und Bausteine Welt 7)

Ergänzung des Motor-/Bausteine-Agenten für Welt 7 „Lava-Festung“ (Stand: Lavawerkstatt `0-26`). Nichts oben Festgelegtes
wird geändert; alles ist additiv. Alle Welt-7-Mechaniken sind parametrierbare Module, Level-Bauer setzen sie nur in Daten
ein; jede Datei dokumentiert ihre Felder vollständig im Kopfkommentar. Aktionen im bekannten Format (die Signal-Verben
`reveal`/`hide`/`start`/`stop`/`toggle`/`open` rufen die gleichnamigen Methoden der benannten Handles). Die Entitäts-Gimmicks
`lavablase`, `druckknopf`, `kiste_wasser` sind auch als `type` in `segments` erlaubt (`w7_misc.js`, Listen `list` bzw.
`kisten`), die Bausteine `feuerstab`, `lava_fontaene`, `lavaspiegel`, `gitterboden`, `pfeilplattform`, `zylinder`,
`stachelwalze_rot`, `pendelstachel`, `klappstampfer`, `zugbruecke`, `schaltfelder`, `giftnebel` auch als `kind` (Hülle wie
Welt 5/6). Richtungen im 90°-Raster; `yaw: −π/2` = Vorderseite zur Kamera (+Z); Level verlaufen nach −Z. Alle Takte laufen
auf der Level-Uhr (`level.time`) – deterministisch, Reihen über `phase` versetzen. Jeder Baustein übernimmt sein
Registry-Modell (Welt-7-Modelle), sonst eigene Ersatz-Geometrie mit gleicher Kollision und Mechanik; `look: 'eigen'` erzwingt
die eigene Geometrie.

### Präzisierung (Motor und Bausteine Welt 7): Dateien

```
src/course/blocks/w7kit.js               w7(level) Sammelstelle { lavas, fogs, fountains, bars, rollers, pendulums, stompers,
                                         bridges, arrows, groups, grates }, figures, modelOr, lavaTopAt, lavaColorAt,
                                         sphereTouches, boxTouches, hurtFigures, killFigures, onRespawn, fireMaterial,
                                         fireBallGeo, lavaMaterial (Lava-Shader), cycle (Takt-Phasen), glowTexture, rotXZ,
                                         flatColor, shadeGeo, pulse, shove, ease, clamp
src/course/blocks/types/w7_fire.js       feuerstab, lava_fontaene
src/course/blocks/types/w7_lava.js       lavaspiegel (steigende/sinkende Lava), gitterboden
src/course/blocks/types/w7_platforms.js  pfeilplattform, zylinder, stachelwalze_rot
src/course/blocks/types/w7_traps.js      pendelstachel, klappstampfer
src/course/blocks/types/w7_castle.js     zugbruecke (mit eingebautem Druckknopf), schaltfelder
src/course/blocks/types/w7_escape.js     giftnebel (Flucht-Front)
src/course/blocks/types/w7_misc.js       Entitäts-Gimmicks als segments-type (lavablase, druckknopf, kiste_wasser)
src/course/blocks/types/deco_w7.js       Kulisse Welt 7 (verschmolzen; Registry-Modelle gebacken)
src/course/entities/kinds/w7_gimmicks.js lavablase, wurfsichel (Geschoss), druckknopf, kiste_wasser + kind-Hüllen
src/course/player/powers/sichel.js       Power-up Wurfsichel (POWERS.sichel)
src/course/view/theme_darkruins|lavarun|lavatower|lavamachine|reef|volcano.js, backdrop_w7.js
src/course/levels/w0/0-26.js             Lavawerkstatt (Stationen S0–S12 mit Schildern, marks für den Test)
tests/course_w7_blocks.mjs               Port 4680, W7B_PART=mech|themes, Bilder tests/out/w7b_*.png
```

Additiv geändert (je wenige Zeilen, mit Kommentar): `player/powers.js` (Aliase `sichel`, `wurfsichel`, `wurf-sichel`,
`bumerang`, `boomerang` → `'sichel'`), `entities/visuals.js` (Item-Modell `wurfsichel_item`, sonst `powerup_sichel`, sonst
eigene Sichel), `CourseUIScene.js` (Power-ups dürfen `def.hudDraw(g, x, y, player)` und `def.hudKey(player)` haben – eigenes
HUD-Symbol mit Zustand), `view/themes.js` (6 Registrierzeilen `??=`). Motor (Player, Level, Kollision) unverändert.

### Präzisierung (Motor und Bausteine Welt 7): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `feuerstab` | drehender Stab aus Feuerkugeln um einen festen Block (oben begehbar); jede Kugel verletzt; mit `block: 'frage'` gibt Kopfstoß/Stampfen den Inhalt, mit `lift` hebt Stampfen den Block auf einer Säule an (trägt die Figur über den Stab) | `pos` (Mitte Unterseite des Blocks), `block` 'stein' \| 'frage' \| false, `size` 1, `length` 6 (Kugeln je Arm, die erste im Block), `arms` 1 (1–4), `spacing` 0.5, `radius` 0.24, `speed` 1.6 (rad/s), `angle` 0, `plane` 'waagerecht' \| 'x' \| 'z', `content` 'coin' \| 'coins:N' \| Power-up \| 'star:I' \| Aktion, `lift` 0, `liftSpeed` 2.5, `onLift`, `idle`, `hidden` → `{ angle, hits, lifted, liftH, used, start(), stop(), reveal(), hide(), points(), info() }` | `{ type: 'feuerstab', id: 'stab2', pos: [5,0,-42], block: 'frage', length: 5, arms: 2, speed: -1.2, content: 'coins:3', lift: 3 }` |
| `lava_fontaene` | Takt Ruhe → Vorwarnung (brodelt, Glutring) → Ausbruch → Halten → Zusammenfallen; `heiss` verletzt (Rückstoß), `tragen`: Krustenplatte reitet oben (trägt hinauf, in Ruhe schwimmt sie) | `pos` (Austritt; y Standard Lava dort, folgt steigender Lava), `height` 5, `radius` 0.7, `mode` 'heiss' \| 'tragen', `plate` 2.4, `wait` 2.5, `warn` 1, `rise` 0.45, `hold` 1.6, `fall` 0.9, `phase`, `trigger` 'takt' \| 'signal' \| 'nah', `near` 3, `color` 'rot' \| 'blau', `follow` true, `idle` → `{ state ('ruhe'\|'warn'\|'steigt'\|'oben'\|'sinkt'), height, top, eruptions, hits, start(), stop(), fire(), info() }`; Platte: MovingBox-Tag `fontaene-platte` | `{ type: 'lava_fontaene', id: 'fontaene2', pos: [3,-1.5,-132], height: 5.5, mode: 'tragen', plate: 2.6, wait: 3, hold: 2.5, phase: 1 }` |
| `lavaspiegel` | Lava mit wechselndem Spiegel: tödliche Form und Oberfläche folgen dem Spiegel (Figuren sterben, Gegner versinken; Lavablasen/Fontänen folgen über `lavaTopAt`) | `pos` (Mitte Unterseite = Grund), `size` [w,h,d] (Ruhe-Spiegel y + h), `mode` 'zyklus' \| 'plan' \| 'signal' \| 'fest', `low`, `high` (low + 3), Zyklus `wait` 4 / `warn` 1.5 / `rise` 3 / `hold` 3 / `fall` 3 / `phase`; `plan` [[t,y]…] + `loop`; Signal `rise` { `to`, `speed` 0.6 }, `reset` true; `color`, `bubbles`, `body` → `{ top, state ('unten'\|'warn'\|'steigt'\|'oben'\|'sinkt'\|'faehrt'\|'ruht'), low, high, shape, setLevel(y, speed), start(), stop(), info() }` | `{ type: 'lavaspiegel', id: 'spiegel', pos: [0,-4,-127], size: [26,2.5,26], low: -1.5, high: 0.4, wait: 4, warn: 1.5, rise: 2.5, hold: 3, fall: 2.5 }` |
| `gitterboden` | begehbarer Gitterrost über Lava (durch die Lücken glüht sie), auch bei hohem Spiegel | `pos` (Mitte Unterseite), `size` [w,d] (4×4), `thick` 0.2, `cell` 0.5, `bar` 0.07, `frame` 0.22, `style` 'eisen' \| 'rost' \| 'blau', `tile` 2 (Modell-Kacheln), `lava` false \| true \| { `depth` 2.2, …lavaspiegel-Felder } → `{ top, lava, info() }`; Form-Tag `gitterboden` | `{ type: 'gitterboden', id: 'gitter', pos: [7,0.3,-120], size: [6,6], thick: 0.2 }` |
| `pfeilplattform` | taucht aus der Lava (oder seitlich aus einer Wand) auf, bleibt, versinkt; Vorwarnung vor beidem (glüht/brodelt; Pfeil blinkt rot, Platte zittert); wer beim Versinken bleibt, fährt mit in die Lava | `pos` (Mitte Unterseite ausgefahren), `size` [3,0.5,3], `from` 'lava' \| 'wand', `depth` size.y + 1.2, `dir` [dx,dz] (wand), `travel`, `arrow` [dx,dz], `mode` 'takt' \| 'signal' \| 'immer', `wait` 2, `warn` 0.8, `out` 0.6, `up` 3.2, `blink` 0.9, `in` 0.7, `phase`, `move` 0, `hidden`, `style` 'stein' \| 'blau' \| 'metall', `color` → `{ state ('weg'\|'warn'\|'kommt'\|'oben'\|'blinkt'\|'geht'), k, mb, carries(fig), reveal(), hide(), start(), stop(), info() }`; MovingBox-Tag `pfeilplattform` | `{ type: 'pfeilplattform', id: 'pfeil2', pos: [0,-0.4,-72], size: [3,0.4,3], arrow: [0,-1], phase: -1.2 }`; Wand: `{ type: 'pfeilplattform', from: 'wand', pos: [8.5,0.6,-72], size: [3,0.4,2.4], dir: [-1,0] }` |
| `zylinder` | großer liegender Zylinder dreht sich; Oberseite trägt wie ein Band, zu den Seiten wird er steil; optional Stachelreihen | `pos` (Achsmitte), `radius` 2.5, `length` 8, `axis` 'x' \| 'z', `speed` 0.6 (+ = Oberseite läuft bei 'x' nach +Z), `slice` 0.3, `spikes` 0 (Reihen), `spikeLen` 0.5, `angle`, `style` 'stein' \| 'blau' \| 'rot' \| 'metall', `ends` true, `idle` → `{ angle, speed, hits, reach, ring, start(), stop(), reverse(), spikeAt(i), info() }`; Form-Tag `zylinder` | `{ type: 'zylinder', id: 'zylinder', pos: [0,-1.6,-91], radius: 2.5, length: 9, speed: 0.5 }` |
| `stachelwalze_rot` | rote Walze dreht sich an Ort und Stelle; Standard rundum bestachelt (jede Berührung, auch von oben, verletzt); mit Zahl Stachelreihen (dazwischen begehbar) | wie `zylinder`, Standard `radius` 1.1, `length` 6, `speed` 1.4, `style` 'rot', `spikes` 'ringsum' (reach = radius + `spikeLen` 0.38) \| Zahl, `stand` false (true: Eisenböcke des Modells, nur Optik – `pos.y` = Boden + `standHeight` (radius + 0.55)) | `{ type: 'stachelwalze_rot', id: 'walze', pos: [0,0.55,-100], radius: 1.1, length: 7, speed: 1.3 }` |
| `pendelstachel` | Stachelkugel an einer Kette pendelt; nur die Kugel verletzt | `pos` (Aufhängepunkt), `length` 4, `radius` 0.6, `swing` 60 (°), `period` 3, `phase` (0..1), `plane` 'x' \| 'z', `mount` true, `idle`, `color` 'eisen' \| 'rot' \| 'blau' → `{ angle, ball {x,y,z}, hits, start(), stop(), info() }` | `{ type: 'pendelstachel', id: 'pendel', pos: [0,5.4,-107], length: 4.6, swing: 55 }` |
| `klappstampfer` | schwere Platte klappt im Takt um ihre Unterkante nach vorn und schlägt auf; Vorwarnung (zittert, Augen glühen, roter Landeboden-Hinweis); darunter: `treffer` (verletzt, oben auf die Platte geschoben) bzw. `tod` (`die('crush')`); Loch sicher; liegend Plattform | `pos` (Scharnier: Mitte Unterkante am Boden), `width` 3, `length` 4, `thick` 0.6, `dir` [0,1], `spikes` true, `damage` 'treffer' \| 'tod', `hole` [u0,u1,v0,v1] \| null, `wait` 2.4, `warn` 0.9, `fall` 0.32, `hold` 1.2, `up` 1.4, `phase`, `mode` 'takt' \| 'nah' \| 'signal', `near` 1.5, `hint` true, `style` 'stein' \| 'metall' \| 'holz', `face`, `idle` → `{ state ('oben'\|'warn'\|'faellt'\|'liegt'\|'hebt'), fold, slams, hits, hint, start(), stop(), fire(), footprint(), info() }` | `{ type: 'klappstampfer', id: 'klapp2', pos: [4,0,-150], width: 3.4, spikes: false, damage: 'tod', hole: [-0.7,0.7,1.4,2.8], phase: 1.2 }` |
| `zugbruecke` | hochgezogen senkrechte Wand (oben schmal begehbar), Signal/Druckknopf senkt sie in `time` s (dazwischen Schräge), gesenkt fester Steg | `pos` (Scharnier: Mitte der Ufer-Kante auf Laufhöhe), `length` 8, `width` 3, `thick` 0.4, `dir` [0,−1], `state` 'oben' \| 'unten', `time` 2.5, `onDown`, `posts` true, `style` 'holz' \| 'eisen', `schalter` { `pos`, `id`, `hidden`, `color` } → `{ state ('oben'\|'senkt'\|'unten'\|'hebt'), k, open(), lower(), close(), raise(), toggle(), start(), info() }` | `{ type: 'zugbruecke', id: 'bruecke', pos: [0,0,-162], length: 8, schalter: { id: 'knopf', pos: [6,0,-160] } }` |
| `schaltfelder` | Kipp-Schaltfeld-Gruppe (wie `switchtiles`); komplett → Weg-Plattformen erscheinen nacheinander (`alle`) bzw. je Feld ein Stück (`stueck`); blasse Umrisse vorher, leuchtende Kanten im Dunkeln | `pos` \| `tiles` \| `grid` \| `spacing`, `toggle`, `indicator`, `weg` [{ `pos`, `size`, `color` }], `modus` 'alle' \| 'stueck', `style` 'stone' \| 'block' \| 'cloud', `color`, `delay` 0.14, `hint` true, `glow` true, `onAll` → `{ tiles, count, done, shown, parts, reset(), info() }`; Teile `${id}_weg` bzw. `${id}_weg${i}` | `{ type: 'schaltfelder', id: 'schalt', pos: [0,0,-181], grid: [2,2], spacing: 1.8, weg: [{ pos: [0,-0.4,-185.5], size: [2.4,0.4,2.4] }, { pos: [0,-0.4,-188.3], size: [2.4,0.4,2.4] }] }` |
| `giftnebel` | Nebelwand rückt wie eine Autoscroll-Front nach (von oben oder waagerecht); hinein = Tod (`gift`) bzw. Treffer + herausgeschoben; Start per Signal, automatisch oder Bereich; Neustart am Checkpoint: Front `gap` m hinter dem Neustart-Punkt, vor dem Bereich wieder wartend | `pos` (Mitte der Front), `size` [a,b], `dir` 'down' \| 'up' \| '±z' \| '±x', `speed` 1.2, `speeds` [{ `at`, `speed` }], `plan` [[t,m]], `to` 40, `depth` 0, `delay` 1.2, `start` 'signal' \| 'auto' \| { `box` }, `signal`, `gap` 4, `damage` 'tod' \| 'treffer', `color` 'lila' \| 'gruen', `puffs` 30, `mood` (z. B. 'flucht'), `visible` → `{ state ('wartet'\|'verzoegert'\|'jagt'\|'ende'), front, frontPos, kills, resets, start(), stop(), reset(), inside(fig), info() }` | `{ type: 'giftnebel', id: 'nebel', pos: [0,4,-197], size: [26,9], dir: '-z', speed: 2.2, to: 22, start: { box: [-13,-1,-204,13,6,-200] }, gap: 3 }` |
| `lavablase` (kind; auch type, Liste `list`) | springt im Takt aus der Lava (Kopf voran), dreht am Scheitel, fällt zurück; Vorwarnung (Lava brodelt); mit `to` Bogen zu einem zweiten Lavapunkt; folgt steigender Lava; unbesiegbar außer Funkelstern, Riesentrank, Explosion | `pos` (Lava-Oberfläche; y Standard Lava dort), `height` 4, `period` 3, `phase` (0..1), `warn` 0.6, `to` [x,z], `color` 'rot' \| 'blau', `size` 1, `count` 1, `spacing` 1.6, `dir` [1,0], `stagger` 0.12, `follow` true, `id`; Zustände unten \| warn \| oben | `{ type: 'lavablase', height: 4, period: 3, list: [{ id: 'blase1', pos: [-4,-0.5,-55] }, { pos: [4,-0.5,-55], color: 'blau', phase: 0.5 }] }`; Bogen: `{ kind: 'lavablase', pos: [-9,-0.5,-53], to: [-9,-57], height: 3 }` |
| `druckknopf` (kind; auch type) | großer Knopf (statt P-Schalter): Draufspringen/Stampfen, Wurfsichel, Geworfenes, Panzer, Explosion → `onPress` | `pos`, `onPress` (Aktion), `once` true, `reset` 4, `color` 'blau' \| 'rot', `id`, `hidden` → `{ pressed, presses, press(via), info() }` | `{ kind: 'druckknopf', id: 'knopf2', pos: [6,0,-160], onPress: { open: 'bruecke' } }` |
| `kiste_wasser` (kind; auch type, Liste `kisten`) | zerbrechliche Kiste unter Wasser, versperrt Gänge; zerbricht durch Rammfisch (`onHit('ram')`), Schwimmstoß (≥ `dash` m/s), Wurfsichel, Panzer, Bombe, Riesentrank, Stern, Tatze, Stampfen; Inhalt steigt als Blasen auf | `pos` (Mitte Unterseite), `size` 1.2, `content` 'coin' \| 'coins:N' \| Aktion \| 'none', `dash` 3.2, `id`, `hidden` → `{ broken, by, info() }` | `{ type: 'kiste_wasser', kisten: [{ id: 'kiste1', pos: [-0.6,-6,-230], content: 'coins:2' }, { pos: [0.6,-6,-230] }] }` |
| `deco_w7` | Kulisse (verschmolzen; Registry-Modelle gebacken, Fahne bewegt) | `items: [{ kind, pos, … }]`, `shadow: false`, `solid: true` (Kollision), `look: 'eigen'`; Arten: burgturm, zinnen (from→to), fahne (`hang`), wappen, kette, fackel (`mount` 'wand' \| 'stand'; Laternenlicht), knochen, rohr (from→to), schlot, zahnrad, basaltsaeule(n), vulkanfels(en), glutriss, lavafall (animiert, `kill` false), koralle(n), seetang | `{ type: 'deco_w7', items: [{ kind: 'fackel', pos: [-12,0,-146], mount: 'stand' }, { kind: 'burgturm', pos: [-6,0,-172], height: 6, radius: 1.3 }] }` |

Hinweise für Level-Bauer: Feuerstab-Reichweite = `(length − 1) · spacing` + `radius` ab Blockmitte; mit `lift` über dem Block
genug Luft lassen (Säule wächst mit der Figur). Lava immer als `lavaspiegel` (mode 'fest' für ruhige Lava) oder `lava`
bauen, damit `lavaTopAt` sie findet. Pfeilplattformen einer Reihe über `phase` versetzen (z. B. 0 / 1,2 / 2,4 s), damit
immer eine oben ist. Zylinder: Figur läuft gegen die Mitnahme an (≈ 1,2 m/s bei speed 0,5, radius 2,5); breite Zylinder
(`length` ≥ 8) lesen sich besser. Klappstampfer-Loch in Plattenkoordinaten (u quer, v vom Scharnier). Zugbrücke: Graben
breiter als `length` − 0,5 bauen, sonst springt man hinüber. Giftnebel: `start.box` an den Eingang des Fluchtbereichs,
Checkpoints vor den Bereich (dann wartet der Nebel wieder) oder mit `gap` ≥ 3 hinein.

### Präzisierung (Motor und Bausteine Welt 7): Power-up Wurfsichel

`player.power = 'sichel'` (Name im Spiel „Wurfsichel“, `getPower('sichel').label`; Aliase `wurfsichel`, `bumerang`,
`boomerang`). Item: `{ kind: 'powerup', power: 'sichel' }` bzw. ?-Block-Inhalt `'sichel'`. Aktion wirft eine Sichel
(Entität `wurfsichel`) in Blickrichtung aus Kopfhöhe: 14 m/s, leichter Bogen (curve 0,7 m nach rechts), bis 7,5 m oder zur
ersten Wand (Wand = früh umkehren, Wand-Besitzer bekommt `onSichelHit`/`onHit('shell')`), dann zurück zur Werferin (durch
Wände), Fangradius 0,9 m, verloren nach 3,5 s. Höchstens eine Sichel je Figur gleichzeitig (`SICHEL_MAX` 1), danach
`SICHEL_COOLDOWN` 0,2 s; Klone werfen je eine eigene. Unterwegs (Hin- und Rückflug): Münzen, blaue/Stern-/Schlüsselmünzen,
Fallmünzen, grüne Sterne, Stempel, Power-ups → eingesammelt für die Werferin; POW, P-Schalter (`onPound`), Druckknopf
(`press('sichel')`); ?-Blöcke, Ziegel, Münzblöcke, Kisten, Unterwasser-Kisten → `onHit('shell')`; Zielscheiben
`onHit('throw')`; Gegner `onSichelHit(sichel)` sonst `onHit('throw', sichel)`; Gong `ring('sichel')`.

Schnittstelle für den **Figuren-Agenten**: Kostüm-Zustand `proxy.course.power = 'sichel'` (Kostüm-Modell
`wurfsichel_kostuem` { part 'muetze' \| 'umhang', size }); `player.sichelFlying` (Sicheln in der Luft – 0 = Sichel in der
Hand zeigen), `player.sichelReady`, `player.sichelCatch` (Zähler; Wechsel = Fang-Moment für eine Fang-Geste); beim Wurf wie
bei allen Würfen Zustand `'throw'` (`player.throwTime` > 0, Dauer `throwDur` 0,25 s). Modelle: `wurfsichel_item` (Item, state
`anim` 'idle' \| 'collected'), `wurfsichel_geschoss` (state { anim 'spin', spin }). HUD: eigenes Symbol (goldener
Sichelmond mit rosa Punkt, blass, solange sie fliegt) über `def.hudDraw`/`def.hudKey`.

### Präzisierung (Motor und Bausteine Welt 7): Signale, Zustände, Schnittstellen

- **Signale/Aktionen**: Zugbrücke `open`/`lower`/`start` (senken), `close`/`raise`, `toggle`; Druckknopf → `onPress` (Aktion,
  z. B. `{ open: 'bruecke' }`); Pfeilplattform (mode 'signal') `reveal`/`start` = auftauchen und bleiben, `hide`/`stop` =
  versinken; Fontäne (trigger 'signal') `start`/`fire` = ein Ausbruch; Klappstampfer (mode 'signal') `start`/`fire` = einmal;
  Lavaspiegel (mode 'signal') `start` fährt hinauf, `stop` hält, `setLevel(y, speed)`; Giftnebel `start` (auch
  `level.signal(spec.signal)`), `stop`, `reset`; Feuerstab/Walzen/Pendel `start`/`stop`; Schaltfelder → Weg-Teile erscheinen
  (`appear`, Namen `${id}_weg…`) + `onAll`.
- **Stimmungen**: `lavatower` hat `flucht` (`view.setMood('flucht')`, z. B. `giftnebel` mit `mood: 'flucht'`); `reef` schaltet
  unter Wasser automatisch (Unterwasser-Stimmung).
- **Todesursachen**: Lava `'lava'` (Form `kill: 'lava'`, folgt dem Spiegel), Giftnebel `'gift'`, Klappstampfer (damage 'tod')
  `'crush'`.
- **Schnittstellen für die Gegner-Agenten**:
  - Wurfsichel: Gegner bekommen `onHit('throw', sichel)` mit `sichel.sichel === true`, `sichel.owner` (Figur), `sichel.pos`,
    `sichel.vel`; wer anders reagieren will (z. B. Boss Zusatzschaden, Bumerang-Werfer fängt), definiert
    `onSichelHit(sichel)` (Rückgabe egal; die Sichel fliegt weiter). Der Bumerang-Werfer kann dieselbe Entität benutzen:
    `level.spawn('wurfsichel', { pos, dir, owner: gegner, speed, range, curve })` – mit einem Gegner als `owner` verletzt sie
    nur Spielfiguren (Kugel 0,38 m um die Sichelmitte), sammelt und löst nichts aus, kehrt zum Gegner zurück (`caught`,
    `gegner.sichelCatch` zählt) und verschwindet, wenn er besiegt/entfernt ist.
  - Lava: `lavaTopAt(level, x, z, yMax?)` (Oberfläche der höchsten Lava dort, folgt `lavaspiegel`), `lavaColorAt(level, x, z)`;
    Gegner, die aus der Lava springen (Platschfisch, Lavadrache), lesen die Höhe je Schritt.
  - Klappstampfer: Gegner unter der Platte bekommen `onHit('crush', handle)`. Feuerstab, Fontäne (heiß), Lavablase,
    Stachelwalze, Pendel verletzen nur Figuren (Gegner gehen durch).
  - Kisten unter Wasser: Rammfisch ruft `onHit('ram')` an der Kiste (auch `onSichelHit`, Panzer/Bombe wie üblich).
  - Druckknopf: `press(via)` von außen (z. B. Kickbombe/Panzer: `'shell'`, `'bomb'`); P-Schalter bleibt `pswitch`.
  - Pfeilplattform: `reveal()` per Aktion `{ reveal: id }` (z. B. „3 Schubser besiegen → 3 Pfeilplattformen“ über `onDefeat`).
  - Giftnebel: `handle.inside(f)` (steckt etwas im Nebel?), `handle.frontPos`.
  - Sammelstelle `w7(level)` für Bosse/Gegner, die Gimmicks steuern (z. B. alle Fontänen `fire()`).
- **Klänge** (vorhandene Effekte, direkt über `level.sfx`): Wurf `boomerang`, Fangen `grab`, Sichel-Treffer/Wand `bump`,
  Feuerstab `burn`, Lavablase `blase`, Lava steigt/Klappstampfer-Warnung `rumble`, Fontäne `splash_big` (Warnung `blase`),
  Klappstampfer-Aufschlag `slam`, Zugbrücke `chain`, Kiste `brickbreak`, Druckknopf `switch`, Giftnebel `wind`,
  Pfeilplattform `bump`, Pendel `swoop`. Wunsch an den Audio-Agenten: eigene Effekte für Wurfsichel-Wurf/-Fang,
  Fontäne und Giftnebel (Namen dann in den Bausteinen umstellen; `tests/sfx_namen.mjs` prüft sie).

### Präzisierung (Motor und Bausteine Welt 7): Modelle

| Modell | genutzt von | Optionen / Zustand aus dem Baustein |
| --- | --- | --- |
| `feuerstab` | `feuerstab` bei size 1 (?-Block zeichnet der Baustein; Stein-Block aus dem Modell) | { length: (length − 1)·spacing, count, arms, plane 'h' \| 'v', color, block }; state { angle } |
| `lavablase` | `lavablase` (sonst `glutball` Welt 5) | { color, size }; state { anim 'hidden' \| 'swell' (grow) \| 'jump' \| 'fall' } |
| `pfeilplattform` | `pfeilplattform` (lava und wand) | { size [w,d], thick, from, depth, dir (Pfeil, rad), color }; state { rise: k, warn: blinkt } |
| `zylinder_walze` | `zylinder` (Stachelreihen zeichnet der Baustein) | { length, radius, color 'stein' \| 'blau' }; state { angle } |
| `stachelwalze_rot` | `stachelwalze_rot` mit spikes 'ringsum' | { length, radius, stand, height }; state { angle } |
| `pendelstachel` | `pendelstachel` (mit Deckenhalter) | { length, size: 2·radius }; state { angle } |
| `klappstampfer` | `klappstampfer` ohne Loch (Stacheln setzt der Baustein auf die Stoßseite) | { size [length, width], thick }; state { fold: 0,5·(1 − fold), warn } |
| `lava_fontaene` | `lava_fontaene` | { radius, color }; state { height, warn } |
| `gitterboden` | `gitterboden` (Kacheln ≈ 2 m, gebacken) | { size [w,d], thick } |
| `zerbrechliche_kiste` | `kiste_wasser` (sonst `crate`) | { size }; state { break, anim 'idle' \| 'hit' } |
| `zugbruecke` | `zugbruecke` (Ketten des Modells zu den eigenen Torpfosten) | { length, width, thick, chains, anchor }; state { lower: k } |
| `giftnebel_wand` | Front des `giftnebel` (Körper eigener Shader) | 'vorn' { width a, height b, depth ≤ 2,5 } bzw. 'unten' (dir 'down'); state { density } |
| `wurfsichel_item`, `wurfsichel_geschoss` | Item, Geschoss | siehe Power-up |
| `push_switch` | `druckknopf` | state { anim 'idle' \| 'pressed' } |
| Kulisse | `deco_w7` (gebacken) | festungsturm (burgturm), basaltsaeule, vulkanfels (brocken), fackel, brummbaer_banner (fahne hang), burg_kette, zahnrad, riffkoralle, seetang; brummbaer_fahne bewegt (Wappen-Textur) |

### Präzisierung (Motor und Bausteine Welt 7): Themen

| Thema | Name | Stimmung / Hintergrund (`backdrop_w7.js`) |
| --- | --- | --- |
| `darkruins` | Dunkler Tempel | unterirdisches warmes Dunkel, Säulenring mit Bögen, Tropfsteine, Fackeln, Glutfunken; kräftiges Figuren- und Laternenlicht (`darktemple`) |
| `lavarun` | Glutpiste | glühender Himmel, entgegenfließender Lavasee tief unten, Funkenstrom an der Kamera, Basaltsäulen, Vulkane (`lavarunway`) |
| `lavatower` | Fallenturm | Turmschacht über Lava, runde Burgmauer mit Fensterschlitzen und Ketten, lila Giftnebel-Decke; Stimmung `flucht` (`lavatower`) |
| `lavamachine` | Lava-Maschinenpark | Lavasee mit Messing-Zahnrädern, Kolben, Rohren, Schloten; helles Werkstattlicht (`lavamachine`) |
| `reef` | Vulkan-Riff | Abendhimmel über Wasser; unter Wasser Blaugrün mit glimmenden Schloten, Korallen, Seetang, Blasen (`reef`, Unterwasser) |
| `volcano` | Vulkan-Lavasee | Krater mit glühenden Adern, Lavasee, ferne pulsierende Fontänen, Rauchsäulen, Asche (`volcano`) |

`bluelava`, `lava`, `fortress`, `lavacastle` sind vorhanden. Jedes Thema lässt sich in `0-26` mit `?theme=<name>` ansehen.

### Präzisierung (Motor und Bausteine Welt 7): Welt 7 – Gimmick → Baustein

| Gimmick (Bauplan) | Baustein |
| --- | --- |
| Wurfsichel / Bumerang, sammelt Münzen (7-Burg u. a.) | Power-up `sichel` (`powers/sichel.js`, Entität `wurfsichel`) |
| Feuerstab-Plattformen, ?-Block in der Mitte hebt an (7-1) | `feuerstab` (`block: 'frage'`, `lift`) |
| Lavablasen, blaue Variante (7-1, 7-Burg) | `lavablase` (`color`, `to`) |
| auftauchende Pfeilplattformen, aus Wänden, per Sieg (7-4) | `pfeilplattform` (`from`, `mode: 'signal'`) |
| Zylinderzone (7-4) | `zylinder` |
| (rotierende) Stachelwalzen (7-3, 7-4) | `stachelwalze_rot` (rundum; Reihen mit `spikes: N`) |
| Pendelstacheln (7-4) | `pendelstachel` |
| steigende/sinkende Lava (7-5, 7-7) | `lavaspiegel` (zyklus/plan/signal) |
| Fontänenfeld mit Gitterboden (7-7) | `lava_fontaene` (heiß/tragend), `gitterboden` |
| Flucht vor Giftnebel (7-5) | `giftnebel` (+ Thema `lavatower`, Stimmung `flucht`) |
| Klappstampfer im Wachbereich (7-Burg) | `klappstampfer` |
| Zugbrücke per P-Schalter/Kickbombe (7-Burg) | `zugbruecke` (+ `druckknopf`, hinter `breakwall`/Blockwand versteckt: `hidden` + `reveal`) |
| Kipp-Schaltfelder machen den Weg sichtbar (7-2) | `schaltfelder` |
| zerbrechliche Kisten unter Wasser (7-6) | `kiste_wasser` |
| Burg-, Vulkan-, Riff-Kulisse | `deco_w7` |

### Präzisierung (Motor und Bausteine Welt 7): Tests und Kennzahlen

`tests/course_w7_blocks.mjs` (Port 4680, `W7B_PART=mech|themes`, `W7B_SHOTS=0` ohne Bilder, `W7B_DEBUG=1`): je Mechanik mit
Gegenprobe – Wurfsichel (Item, Wurf/Rückkehr/Fangen, nur eine gleichzeitig, Münzen über der Lava, Gegner vorn getroffen/seitlich
nicht, ?-Block, grüner Stern, Wand = früh umkehren, HUD), Feuerstab (Drehung, Treffer/außerhalb heil, Stampfen hebt den
?-Block samt Figur), Lavablasen (Takt mit Vorwarnung, rot/blau, Bogen, Treffer/Inselmitte heil, folgt steigender Lava),
Pfeilplattformen (Takt, trägt, versinkt → Lava, Wand, Signal), Zylinder (Mitnahme/angehalten), Stachelwalze (oben getroffen,
davor heil), Pendel, Lavaspiegel (Zyklus, tiefe Säule tot/hohe heil), Gitterboden, Fontänen (heiß, tragend), Klappstampfer
(Vorwarnung, Treffer, Loch heil, zerquetscht), Zugbrücke + Druckknopf (auch per Wurfsichel), Schaltfelder (3 von 4: nichts),
Giftnebel (Bereich startet, stehen bleiben = Tod, fliehen = heil, Neustart setzt zurück; von oben), Unterwasser-Kisten
(Schwimmstoß, langsam nicht, Rammfisch), Hüllen als kind, Ziel; keine Konsolenfehler; Themen (Namen, Kulissen, Stimmung
`flucht`, Unterwasser). 48 + 4 Prüfungen (Gegner-Sichel eingeschlossen). Kennzahlen (inkl. Schattenpass, mit Welt-7-Modellen): Stationen 47–77
Zeichenaufrufe / 98–149 k Dreiecke, Themen 59–82 / 96–146 k (Grenzen 120 / 300 k).


## Präzisierung (Figuren Welt 7): Wurfsichel-Kostüm und Wurf-Pose

Ergänzung des Figuren-Agenten (additiv; Motor, Modelle, Level unverändert). Dateien: `src/three/lib/heroSichel.js` (Bausteine,
Gestaltung nach der Vorlage `wurfsichel_kostuem`, Farben wie dort), `src/three/avatars/hero.js` (Kostüm `'sichel'`, Posen),
`src/course/player/HeroRig.js` (+3 Zeilen: `proxy.course.sichelFlying`, `sichelReady`, `sichelCatch` aus der Figur),
Test `tests/kostuem_w7.mjs`.

- **Kostüm** (`proxy.course.power = 'sichel'`, beide Heldinnen, groß/klein): türkise Schirmmütze mit Goldband, rosa Bommel hinten
  und goldenem Mondsichel-Kamm (Lotti trägt ihre Schleife am Band, Gretas Haarreif ruht unter der Mütze); kurzer Umhang auf dem
  Rücken (innen rosa, Goldpaspel, Saum als Mondsichel, goldene Mondsichel mit Sternchen), goldene Kordel mit Sichel-Schließe;
  Wurfsichel in der nahen (rechten) Hand. Umhang schwingt um den Nacken (Schwerkraft in Weltlage, Fahrtwind aus Tempo/Fallen,
  Flattern; Kanone, Wasser, Ritt, Wand eigene Lagen); Gretas langes Haar liegt auf dem Umhang.
- **Zeichenaufrufe:** Mütze und Umhang in der Stoff-, Kamm und Hand-Sichel in der Glanz-Oberfläche (Figur-Bündel), Kordel und
  Schließe im Oberkörper-Mesh – Stand mit Kostüm 9 = ohne 9 Aufrufe (inkl. Schattenpass), Dreiecke ≈ 1,17×. Schatten wirft nur
  der Umhang (die Haarschale unter der Mütze wirft fast dieselbe Silhouette). Klone (lite) tragen alles ohne Schattenwurf.
- **Sichel in der Hand:** sichtbar, solange `sichelFlying` 0 ist und die Hand frei ist (Stand, Laufen, Springen, Saltos, Fallen,
  Landen, Hocke, Rutschen, Stampfen, Wandsprung, Treffer, Jubel, Schlittschuh); beim Klettern, an Wand/Zaun/Gitter/Trapez, in
  der Kanone, beim Schwimmen, Reiten (Angel), in der Röhre, als Statue und beim Tragen steckt sie weg. Der Motor erzeugt die
  fliegende Sichel mit der Aktion – deshalb verschwindet sie sofort aus der Hand (die Wurf-Pose holt mit leerer Hand aus).
  Im Fang-Schritt zählt `sichelFlying` die Sichel noch mit – der Wechsel von `sichelCatch` zeigt sie sofort. Verlorene Sichel
  (nach 3,5 s) erscheint ohne Fang-Geste wieder (wächst kurz).
- **Wurf-Pose** (`'throw'` mit Kostüm, Phase aus `throwTime`/`throwDur`): Seitarm-Wurf wie eine Frisbee (passt zur flach
  kreiselnden Sichel): bis Phase 0,14 ausholen (nahe Hand seitlich hinten in Schulterhöhe, Rumpf zurückgedreht, ferne Hand
  zeigt aufs Ziel), bis 0,34 fegt der Arm über die Seite nach vorn (Rumpf dreht mit, Mund auf), dann Ausschwingen quer vor den
  Körper; im Stand Wurfstellung (ferner Fuß vor, Füße per Bein-IK am Boden), im Lauf/Sprung laufen die Beine weiter.
  Greta zeigt beim Jubel kein Peace-Zeichen, sondern hält die Sichel hoch.
- **Fang-Geste** (Wechsel von `sichelCatch`, 0,45 s): nahe Hand schnappt nach vorn und holt die Sichel heran, Augen „◡“, kleiner
  Hüpfer im Stand, goldenes Funkeln (PuffFx, nur solange sichtbar, nicht bei Klonen), Sichel kreiselt in der Hand aus.
- **Kombinationen:** Halloween – die Mütze ersetzt Hexenhut bzw. Katzenohren wie Krallen-Kapuze/Gleitblatt (Lotti: Kürbis-Bommel,
  Greta: Katzenohren an der Mütze; Schnurrhaare und Katzenschwanz bleiben), Umhang-Futter orange. Trage-Helm: Mütze und Kamm
  ruhen (Haar mit Schleife/Haarreif wie sonst). Pflaume-Ritt: Mütze und Umhang bleiben, Sichel steckt weg (Angel in der Hand).
- **Test** `tests/kostuem_w7.mjs` (Vite-Entwicklungsserver, Port 4375 + PORT_BASE, Lavawerkstatt `0-26`; je Heldin
  `KW7_HEROES=lotti` bzw. `greta`, unter Last die Teile einzeln `KW7_PARTS=mech` / `close` / `ride`): echter Motor – Item aufnehmen, Wurf (Phasen), Flug,
  Fang, Wurf im Lauf, Klone; Bank – Nahansichten, Posen, Wurf-Phasen, Fang, Verlust, Halloween, Helm, klein; Ritt mit Pflaume.
  Bilder `tests/out/kostuem_w7_*.png`, Bögen `kostuem_w7_sheet_<heldin>_<gruppe>.png`; keine Konsolenfehler.

## Präzisierung (Gegner Welt 7)

Ergänzung des Gegner-Agenten Welt 7 „Lava-Festung“ (Stand: Lava-Gegnerzoo `0-27`, Lava-Bossarenen `0-28`). Nichts oben
Festgelegtes wird geändert; alles ist additiv. Level-Bauer schreiben nur Daten; alle Felder sind optional, sofern nicht anders
vermerkt. Gemeinsame Felder und Konter aus „Präzisierung (Gegner/Power-ups)“ und „(Gegner Welt 2–6, Halloween)“ gelten weiter
(`id, pos, dir|yaw, path, loop, wake, edges, drop`; Ziel = nächste Figur, Lava/Absturz = besiegt, `STRONG` = cannon, bomb,
mega, star; Pilz-Maske über `maskedFrom`). Jede Datei dokumentiert ihre Parameter vollständig im Kopfkommentar. Kindgerecht:
besiegte Gegner fallen klappernd auseinander, kühlen zu Stein ab, verpuffen oder versinken mit Schwindelsternen; der Baron
flieht am Ende lustig mit dem Zylinder in der Tatze.

### Präzisierung (Gegner Welt 7): Dateien

```
src/course/entities/w7help.js                     Hilfen (außerhalb kinds/): HOT_KILL, isSichel, hurtsFrom, lavaSurface (lavaTopAt),
                                                  lavaColor (lavaColorAt), lavaAt, waterTop, arcVel (Wurfbogen), phaseOf
src/course/entities/kinds/knochenflieger_w7.js    knochenflieger
src/course/entities/kinds/platschfisch_w7.js      platschfisch (+ Spender spawner: endlos nachkommend)
src/course/entities/kinds/lavadrache_w7.js        lavadrache
src/course/entities/kinds/wutkaulquappe_w7.js     wutkaulquappe
src/course/entities/kinds/funkenflaemmchen_w7.js  funkenflaemmchen
src/course/entities/kinds/baron_kampfwagen_w7.js  baron_kampfwagen (Boss 7-Burg), kampfwagen_strasse (Boss-Straße), stachelfalle
src/course/entities/kinds/feuer_werfer.js         + sichel (Bumerang-Werfer mit Wurfsichel), fireColor 'blau'
src/course/entities/kinds/fische_w3.js            + Rammfisch: size, center/radius (Kreis), Bahn mit Höhen, ram, carries 'star:I',
                                                  rammt Unterwasser-Kisten auf (onHit('ram'))
src/course/entities/kinds/lavafelsen_koenig.js    + variant 'hell', fish (Platschfische rings um die Arena)
src/course/entities/kinds/schubser_prinz_w6.js    + color 'blau' (blaue Feuerkugeln in einer Kurve, 3 → 4 → 5)
src/course/entities/kinds/geschosse.js            + feuerkugel: color 'blau' (Modell feuerkugel_blau), curve (rad/s), curveFor (s)
src/course/entities/kinds/panzerkroete.js, feuer_w5.js, klapperknochen_hw.js   + Wurfsichel (je eine Zeile, siehe unten)
src/course/archetypes/hud.js                      + Lebensleiste mit mehr als 5 Herzen (kleiner, breiter; Baron 9)
src/course/levels/w0/0-27.js                      Lava-Gegnerzoo (8 Reihen Gehege, Z(r, dz) = −8 − 20(r − 1) − dz, Thema lava)
src/course/levels/w0/0-28.js                      Lava-Bossarenen (LEVEL.bosses: Basaltinsel, Prinzen-Käfig, Boss-Straße)
tests/course_w7_enemies.mjs                       Port 4690, W7E_PART=1|2|3|4, Bilder tests/out/w7e_*.png
```

Modelle: die fertigen Welt-7-Modelle – `knochenflieger`, `platschfisch` ({ color }), `lavadrache` ({ color, segments };
`userData.head()`, `model.mouth()`), `wutkaulquappe`, `funkenflaemmchen` ({ color }), `bumerang_werfer` ({ sichel: true };
state `dropped`), `feuerkugel_blau`, `rammfisch` (× size), `lavafelsen_koenig` ({ variant: 'hell' }), `schubser_prinz`
({ color: 'blau' }), `baron_kampfwagen` (`model.hand()`, `model.muzzle()`), `kampfwagen_strasse` (Fahrbahn-/Lücken-Teile),
`stachelfalle`; zur Flucht `baron_brummbaer` { withCar: false } (Welt 1). Stachelpanzer, Zauberkröte, Pilzlingsturm,
Hammer-/Feuer-Werfer sind die vorhandenen Arten (geprüft, unverändert bis auf die Wurfsichel).

### Präzisierung (Gegner Welt 7): gemeinsame Regeln

- **Heiße Gegner** (Platschfisch, Lavadrache, Funkenflämmchen): **nicht von oben** – Draufspringen/Stampfen verletzt die
  Figur. Nur **Power-ups und Wurfsichel** besiegen sie (`HOT_KILL` = claw, sichel, shell, throw, cannon, bomb, mega, star,
  punch, bite, crush, pow; claw = Tatzenhieb, Schwanzhieb, Krallen-Sturzflug). **Feuer prallt ab** (Funken). Rutschen und
  Stampfwelle daneben wirken nicht.
- **Wurfsichel** (Motor: `onSichelHit(sichel)`, sonst `onHit('throw', sichel)` mit `sichel.sichel === true`): wirkt wie ein
  Wurf – Welt-7-Gegner (Knochenflieger, Wutkaulquappe, heiße Gegner) und alle Gegner, die ein Wurf besiegt, sind besiegt
  (geprüft: 44 Arten, darunter Lavabrocken); zähe Gegner verlieren einen Trefferpunkt (Riesenschnappblume, Rammbock-Bulle,
  Großrollpilz, Riesenkürbling, Münzmarder); unverwundbare bleiben heil (Stampfstein, Wuschel, Spuk, Kreisgeist, Stachelfisch,
  Rammfisch, Funkenläufer, Riesenameise, Stachelwalze, Lavafunke, Glutball, Feuerring). Sonderfälle: Panzer gleitet weg
  (`panzerkroete.js` erkennt `source.sichel`), Kickbombe/Zündkopf zünden, Schubser wird gestoßen, Pilzlingsturm verliert eine
  Stufe, Funkenling und Klapperknochen sind besiegt (dort wie Krallen). Endgegner: Baron = Zusatzschaden (Kratzer), andere
  Bosse wie bisher (Sichel = 'throw').
- **Lava folgt dem Spiegel**: Platschfisch und Lavadrache lesen je Schritt `lavaTopAt` (über `lavaSurface(level, x, z, near)`
  = höchste Lava bis near + 8 m); Farbe ohne `color` = `lavaColorAt` an `pos` (blaue Lava → blaue Fische/Drachen/Kugeln).
- **Gegner-Sichel** (Bumerang-Werfer mit `sichel: true`): `level.spawn('wurfsichel', { pos, dir, owner: werfer, speed: 9,
  range: clamp(Abstand + 1,5, 4, 9), curve })` – verletzt nur Figuren, kehrt zum Werfer zurück (`sichelCatch`), verschwindet
  mit ihm. Besiegt lässt er das Power-up `{ kind: 'powerup', power: 'sichel' }` fallen (an seiner Stelle, nach Lava/Absturz an
  `home`).
- **Sound** nur über vorhandene `level.sfx`-Namen: `hover`, `swoop`, `blockhit`, `stomp`, `splash`, `burn`, `fireball`,
  `boss_hit`, `dash`, `bounce`, `poof`, `hop`, `panic`, `slam`, `cannon`, `powerdown`, `land`, `switch`, `kick`, `boomerang`;
  Fanfare `course_clear` über den Boss-Archetyp (`tests/sfx_namen.mjs` grün).

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| knochenflieger | fliegt Kreis/Bahn/schwebt; Figur darunter → Ankündigung (klappert) → Sturzflug-Bogen genau durch die Figur → steigt zurück | Draufspringen/Stampfen, Krallen-Sturzflug, Rutschen, alle Angriffe (auch Feuer, Wurfsichel) | seitliche Berührung (auch im Sturzflug) |
| platschfisch | verborgen in der Lava; lugt, springt im Takt im Bogen (Löcher reihum / pendelt / zielend); spuckt jeden n-ten Takt eine Feuerkugel geradeaus; endlos über `spawner` | nur HOT_KILL (Power-ups, Wurfsichel) – kühlt zu Stein ab | Berührung (aufgetaucht, im Sprung), **auch von oben**, Feuerkugel |
| lavadrache | verborgen im Lavasee; Figur nah → taucht auf, speit Feuerbälle im Bogen auf sie (hüpfen weiter), taucht ab, wechselt die Stelle | nur HOT_KILL am aufgetauchten Kopf (hp Treffer) | Kopf (auch von oben), Hals, Feuerbälle |
| wutkaulquappe | unter Wasser: paddelt/kreist; Figur im Wasser nah → schwimmt an, bläst sich auf, stößt als Stachelkugel | Angriffe (auch aufgeblasen), Draufspringen/Stampfen nur unaufgeblasen | Stachelkugel (Stoß weg), seitlich |
| funkenflaemmchen | hüpft in kleinen Bögen (Bahn / geradeaus mit Kantenumkehr / jagt); fährt auf Plattformen mit, zählt auf Druckfeldern (weight) | nur HOT_KILL; Wasser löscht es | jede Berührung (auch von oben) |
| bumerang_werfer + sichel | wirft die Wurfsichel statt des Bumerangs, fängt sie | wie Werfer (von oben, Angriffe) – lässt die Wurfsichel fallen | Sichel, Berührung |
| rammfisch (Welt 7) | groß/kreisend, auf und ab, mit Stern in der Blase; rammt Unterwasser-Kisten auf | nur STRONG | Berührung |
| lavafelsen_koenig hell | 4-Burg + Platschfische rings um die Arena | geworfene Lavabrocken (3×) | wie 4-Burg, Platschfische |
| schubser_prinz blau | 6-A + blaue Feuerkugeln in einer Kurve (3/4/5) | Tritt nach der Röhrenfahrt (3×) | Rammstoß, Feuerkugeln |
| baron_kampfwagen | Boss 7-Burg (siehe unten) | zurückgekickte Kickbomben (9×), Wurfsichel-Kratzer (2 = 1 Treffer) | Wagen, Bomben, Feuer, Stachelfallen |

### Präzisierung (Gegner Welt 7): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Knochenflieger: pos = Körpermitte (ohne Bahn schwebt er hier); center + radius 3 + cw false (Kreis, y = Flughöhe) |
  //   path [[x, y, z], …] + loop (Flugbahn, Runde ab 3 Punkten); speed 2.4, phase 0..1, sight 7 (waagerecht), reach 7 (m tiefer),
  //   dive 9 (m/s), warn 0.5 (s Ankündigung), cooldown 1.8, bob 0.18, drop
  { kind: 'knochenflieger', center: [0, 5, -40], radius: 3.5, sight: 6 },
  { kind: 'knochenflieger', pos: [-6, 5.5, -50], path: [[-8, 5.5, -50], [8, 5.5, -50]] },
  // Platschfisch: pos = Lavastelle (y = Lava-Oberfläche); holes [[x, y, z], …] (reihum, zwei = hin und her) | pos + dir + dist 4
  //   (pendelt); height 2.6, every 2.4, flight 1.1, phase 0..1, peek 0.4, aim false (springt dist m auf die Figur zu, nur über
  //   offener Lava, höchstens range = 2·dist von pos), sight 9, spit 0 (jeder n-te Takt spuckt; true = 2), spitSpeed 7,
  //   color 'rot' | 'blau' (Standard lavaColorAt), drop,
  //   spawner { every 2.2, max 4, hops 3, first 0, range 30 } (unsichtbarer Spender: neue Fische springen hops Bögen in dir)
  { kind: 'platschfisch', pos: [0, 0.6, -40], dir: [1, 0], dist: 5, spit: 2 },
  { kind: 'platschfisch', pos: [-8, 0.6, -60], dir: [1, 0], dist: 4, spawner: { every: 2.5, max: 3, hops: 4 } },
  // Lavadrache: pos = Austrittspunkt (y = Lava-Oberfläche) | spots [[x, y, z], …] (Auftauchstellen reihum; aim: die der Figur
  //   nächste); sight 16, hide 2.0, shots 2, interval 1.1, flight 0.95, lead 0, speed 0 (Hüpfen der Kugel), hp 1, phase 0..1,
  //   color 'rot' | 'blau' (Standard lavaColorAt), segments 7, drop
  { kind: 'lavadrache', spots: [[-6, 0.5, -80], [6, 0.5, -84]], shots: 2, sight: 14 },
  // Wutkaulquappe: pos = Körpermitte unter Wasser; path + loop | center + radius 2.5 + cw; speed 1.2, sight 6, chase 2.6,
  //   puffR 1.8, puff 1.4 (s aufgeblasen), shove 6, push 7 (m/s Stoß auf die Figur), cooldown 1.2, range 8, size 1.25, drop
  { kind: 'wutkaulquappe', pos: [4, -1.5, -40], center: [4, -1.5, -40], radius: 2 },
  // Funkenflämmchen: pos = Fußpunkt; path + loop | dir (geradeaus, kehrt an Kanten/Wänden um; edges false = springt hinunter);
  //   behavior 'hop' | 'chase', sight 6, hop 0.8, height 0.45, pause 0.12, phase 0..1, color 'rot' | 'blau', weight 0, wake, drop
  { kind: 'funkenflaemmchen', pos: [3, 1, -30], path: [[1, 1, -30], [5, 1, -30]] },
  // Bumerang-Werfer mit Wurfsichel (7-Burg); Feuer-Werfer mit blauen Kugeln (7-1)
  { kind: 'bumerang_werfer', pos: [0, 2, -90], sichel: true },
  { kind: 'feuer_werfer', pos: [6, 2, -90], fireColor: 'blau' },
  // Rammfisch (Welt 7): size 1, center + radius 4 + cw (kreist, rammt nicht – außer ram: true), path mit Höhen | vertical
  //   (auf und ab), ram true|false, carries 'star:I' (Stern I in der Blase; LEVEL.stars listet ihn nicht)
  { kind: 'rammfisch', pos: [0, 1, -120], center: [0, 1, -120], radius: 3.4, size: 2 },
  { kind: 'rammfisch', pos: [6, 1, -125], path: [[6, 1, -125], [6, 6, -125]] },
  { kind: 'rammfisch', pos: [-6, 2, -125], carries: 'star:2' },
],
```

Laufzeit (für Tests und Gimmicks): Knochenflieger `state` (fly | warn | dive | rise | defeated), `dives`, `diveFrom/diveLow/
diveTo`, `mode` ('circle' | 'path' | 'hover'), `body()`; Platschfisch `state` (wait | peek | jump | surface | spit | defeated;
Spender `source`), `jumps`, `spits`, `hole`, `apex`, `lastShot`, Spender `isSource`, `kids`, `spawned`; Lavadrache `state`
(hidden | rise | idle | spit | sink | hit | defeated), `rises`, `fireballs`, `hits`, `spot`, `head()`, `rise` (0..1);
Wutkaulquappe `state` (swim | chase | inflate | shove | puffed | deflate | defeated), `puffs`, `shoves`, `puffK`;
Funkenflämmchen `state` (rest | crouch | air | land | defeated), `hops`, `airborne`; Werfer `sichel`, `sichelDropped`;
Rammfisch `size`, `star`. Alle mit `info()`.

### Präzisierung (Gegner Welt 7): Varianten (7-A, 7-B)

```js
// heller Lavafelsen-König (7-A): wie 4-Burg, dazu Platschfische rings um die Arena (Standard bei variant 'hell')
{ kind: 'lavafelsen_koenig', id: 'koenig', pos, arena: { center, r }, variant: 'hell',
  fish: { count: [2, 3, 4], ring: r + 1.6, height: 3.2, every: [3.0, 2.6, 2.2], flight: 1.15, inside: 0.9, spit: 0,
          color: 'rot', gate: null (rad, Richtung des Eingangs: x = cos, z = sin; +Z = π/2), gateHalf: 0.35 } | true | false,
  star: { pos, index } }
// blauer Schubser-Prinz (7-B): wie 6-A, blaue Feuerkugeln in einer Kurve
{ kind: 'schubser_prinz', id: 'prinz', color: 'blau', fire: [3, 4, 5], curve: 1.1, gap: 0.12, pos, dir, arena, net, star }
```

Heller König: Platschfische springen ab dem Auftritt im Lavasee rings um die Arena in Bögen über den Arenarand (Sehne reicht
`inside` m hinein, `count` je Phase gleichmäßig verteilt, der Eingang ±`gateHalf` bleibt frei); Tod im Kampf und Sieg nehmen
sie weg. Laufzeit `fish` (lebende), `fishList`. Blauer Prinz: spuckt `fire[Phase]` blaue Feuerkugeln (`feuerkugel` mit
`color: 'blau'`, `curve`) kurz nacheinander (gap s) auf derselben Kurvenbahn – Start um curve · 0,5 s neben der Figur, jede
zweite Salve zur anderen Seite –, eine Feuerschlange, die über die Figur hinwegfegt. Ansagen Phase 2/3: „Jetzt spuckt er
vier Feuerbälle!“, „Jetzt spuckt er fünf Feuerbälle!“. Laufzeit `volleys`, `blue`.

### Präzisierung (Gegner Welt 7): Baron Brummbär im Kampfwagen (7-Burg)

```js
items: [{ kind: 'kampfwagen_strasse', id: 'strasse', from: [x, y, z] (Mitte der Oberkante am Anfang, Straße nach −Z),
          length: 150, width: 12, thick: 1.2, depth: 1.5, rails: true,
          gaps: [{ at (m ab Anfang, Lückenmitte), width: 3 }], middle: [{ from, to, width: 2 }],
          traps: [{ at, x: 0, size: [2, 3], phase: 0..1 }] }],
enemies: [{ kind: 'baron_kampfwagen', id: 'baron', road: 'strasse', pos: [x, y, z] (Wagenmitte beim Kampfbeginn), hp: 9,
            window: 14, speed: [2.4, 2.8, 3.2], lane: [-3.6, 3.6], endHold: 9, every: [2.7, 2.3, 2.0], bombs: [1, 2, 2],
            shortEvery: [4, 3, 2], flight: 1.0, fuse: 2.8, shortFuse: 1.0, fire: [3, 2, 2], fireShots: [1, 3, 3],
            fireSpeed: 7, traps: [3.4, 3.0, 2.0], sichel: 2, star: { pos, index } | [x, y, z], wakeR: 12, seed }],
boss: { id: 'baron', name: 'Baron Brummbär', speed: 0, trigger (am Straßenanfang), warp, warpPos, warpTo, frame: 0.5, center }
// freie Stachelfalle (auch ohne Straße): { kind: 'stachelfalle', pos (Oberseite), size: [2, 3], period: 3.2, up: 1.2,
//   warn: 0.8, phase: 0..1, active: true, yaw }
```

Boss-Straße: Basalt-Fahrbahn mit Kollision; **Lavalücken** quer über die ganze Breite (Lava 1,2 m tiefer, hineinfallen =
Lava), **Mittellücken** (links/rechts bleibt je eine Spur), **Stachelfallen** (Entität `stachelfalle`: Lampen blinken/Stacheln
zucken `warn` s, dann `up` s draußen – jede Berührung bis 0,65 m über der Platte verletzt; im Kampf taktet der Baron sie mit
`traps[Phase]` s, sonst eingefahren), unsichtbare Leitplanken an den Außenkanten (nicht über Lücken). Schnittstelle
`solidAt(x, z)`, `gapsBetween(zHi, zLo)`, `midAt(zHi, zLo)`, `trapsOn`, `trapPeriod`, `traps`, `info()`.

Ablauf: `wait` (unsichtbar) → `intro` (2,4 s, braust heran) → **Autoscroll**: das Kampffenster (`window` m) wandert mit
`speed[Phase]` m/s; der Wagen fährt rückwärts an der Vorderkante (blickt zur Figur), die Hinterkante **schiebt die Figur** mit
(auch in Lücken), am Wagen vorbei kommt sie nicht. Lavalücke → der Wagen **springt** hinüber (0,9 s) und wartet, bis das
Fenster nachkommt; über Mittellücken fährt er mittig. Am Straßenende (`endHold` m davor) bleibt das Fenster stehen.
Angriffe alle `every[Phase]` s: **Kickbomben werfen** (1 bzw. 2, 1,6 m vor die Figur, nie in eine Lücke, Landemarke; jede
`shortEvery`-te mit kurzer Lunte `shortFuse` s – Ansage „Vorsicht – gleich explodiert sie!“), jeder `fire`-te Angriff **Feuer
spucken** (Kanone, `fireShots` Kugeln, ab Phase 2 als Fächer = Feuerstoß). **Treffer**: zurückgekickte Kickbomben
(`onBombHit`; Zielhilfe: gekickte Bomben, die grob auf den Wagen rollen, lenken ein und hüpfen über Lavalücken) → `hit`
(0,6 s) → `stunned` (1,1 s) → weiter. **Wurfsichel = Zusatzschaden**: jede geworfene Sichel kratzt einmal (Hin- und Rückflug
zusammen; Ansage „Kratzer!“, goldene Punkte in der Lebensleiste = `carHits`), `sichel` Kratzer = ein Treffer. 9 Treffer in 3
Phasen: Phase 2 Doppelwurf + Feuerstoß („Mehr Bomben – und ein Feuerstoß!“), Phase 3 schneller, Stachelfallen öfter („Er wird
schneller – Vorsicht, Stacheln!“). Draufspringen = Abprall ohne Schaden; Feuer, Krallen, Panzer, Stern, Riese, Explosionen
daneben zählen nicht; Berührung des Wagens verletzt. Besiegt → `defeated` (2,2 s: Wagen bremst, sackt schief ab, qualmt,
eigene Bomben verpuffen, Fallen fahren ein; Fanfare über den Archetyp) → `flee` (3,0 s: der Baron springt seitlich aus dem
Wagen und hüpft schwindelig im Zickzack davon, den Zylinder in der Tatze) → `gone` (Stern; Archetyp: Warp-Box). Tod im Kampf
(`reset`): Baron 9/9, Wagen und Fenster zurück, Bomben/Feuerkugeln weg, Fallen eingefahren. Schnittstelle wie Graf Brummbär
(`begin, reset, state, stateT, hp, maxHp, phase, visible, home` (wandert mit – Kampfkamera), `half, carHits, vulnerable,
info()`), `level.onBossHit(boss, 'bombe' | 'sichel')`, `level.onBossDefeated(boss)`, `boss: true`, kein `enemy`. Laufzeit:
`s, frontZ, backZ, throws, bombsThrown, shortBombs, fires, fireballs, jumps, pushes, hits, hitLog, sichelHits, bounces`.
HUD: Lebensleiste „Baron Brummbär“ mit 9 kleineren Herzen (`hud.boss` ab 6 Herzen).

### Präzisierung (Gegner Welt 7): Hinweise für Level-Bauer

- **Knochenflieger (7-4, 7-5, 7-7)**: Flughöhe 3,5–5 m über dem Weg (er stößt bis `reach` m tief herab; der Bogen endet auf
  Starthöhe hinter der Figur); er fliegt durch Wände – über engen Turm-Wegen `radius` ≤ Wegbreite + 1. Mehrere mit `phase`
  versetzen. Von oben besiegbar: an Stellen mit Absprungmöglichkeit (Podest, Stampfstein) stellen.
- **Platschfisch (7-7, 7-A)**: `pos`/`holes` auf die Lava legen (y = Oberfläche; bei `lavaspiegel` folgt er von selbst).
  Bögen über Wege zwischen zwei Löchern (`height` 2,6 m) – Abstand halten oder eine Taktlücke lassen. Spucken nur 1–2 je
  Gruppe (`spit: 2` bzw. `3`). Endlos (`spawner`) entlang eines Uferwegs: `dir` parallel zum Weg, `range` ≈ Strecke, auf der
  sie kommen sollen. `aim` nur über großer, offener Lava (er springt nicht unter Plattformen).
- **Lavadrache (7-7 Drachenbucht)**: `spots` 4–8 m vom Weg, Deckung (Felsen) zwischen zwei Stellen; Feuerbälle landen bei
  der Figur und hüpfen weiter (Weg ≥ 3 m breit). Besiegbar nur mit Power-up/Wurfsichel – ein Power-up davor anbieten oder ihn
  als Hindernis behandeln. Blaue Lava → blauer Drache (ohne `color`).
- **Wutkaulquappe (7-6)**: in Becken ≥ 2,5 m tief; `range` ≤ Beckengröße. Sie verlässt das Wasser nie – Inseln/Ufer sind
  sicher. Angriffe unter Wasser (Tatzenhieb, Wurfsichel) besiegen sie auch aufgeblasen.
- **Funkenflämmchen (7-2, 7-5)**: auf Plattformen/Schaltfeldern mit `path` oder `dir`; es springt nie von Kanten (außer
  `edges: false`). Mit `weight: 1` drückt es Druckfelder (pfeld) – Rätsel „Flämmchen auf das Feld locken“ mit `behavior:
  'chase'`. Wasser löscht es.
- **Bumerang-Werfer mit Wurfsichel (7-Burg)**: `sichel: true` – die fallengelassene Wurfsichel ist das Power-up für den Rest
  der Burg (Baron!). Steht er über Lava, erscheint sie an seinem Platz (`home`): `home` auf festen Boden legen.
- **Rammfisch (7-6)**: große rotierende `size` 2–2,5 + `center/radius`; Stern-Träger `carries: 'star:I'` (Stern nicht
  zusätzlich in `LEVEL.stars`/`items`); er bricht Unterwasser-Kisten (`kiste_wasser`) auf, wenn er hineinrammt.
- **7-A (Archetyp arena)**: Lavafelsen-König mit `variant: 'hell'` auf einer runden Felsfläche r ≥ 10 m mit Lava ringsum
  (Lava ≈ 1,4 m unter der Fläche, damit die Bögen gut sichtbar sind), `fish.gate` auf den Steg/Eingang. Ohne
  `LEVEL.boss(es)` beginnt der König selbst (`wakeR`) und setzt den Stern; Neustart nach Tod und Arena-Zählung wie
  `prinzKampf` in `levels/w6/_helpers_b.js` (König `reset()` im `respawn`, `arch.boss = koenig`, `onBossDefeated →
  arch.onDefeated`).
- **7-B (Archetyp arena)**: wie 6-A (Käfig 20 × 20 m, `glasnetz`, `prinzKampf`), nur `color: 'blau'` beim Prinzen.
- **7-Burg**: Boss-Straße als Item (`kampfwagen_strasse`) nach dem Burg-Parcours; `boss.trigger` 1–5 m hinter dem
  Straßenanfang, Startplatz/Checkpoint davor, `boss.center` in Straßenmitte; Lavasee unter der Straße (0-28: 3,2 m tiefer),
  Lücken 2,6–3 m breit (der Wagen springt, die Figur auch), Mittellücke z. B. 20 m lang, Stachelfallen nicht in Lücken und
  nicht in den ersten Metern; Stern und Warp-Box am Straßenende (`star` ≈ 16 m vor dem Ende, `warpPos` daneben). Kamera wie
  0-28 (`pitch` 40, `dist` 17, `ahead` 1,2). Die Wurfsichel aus der Burg verkürzt den Kampf (2 Kratzer = 1 Treffer).

### Präzisierung (Gegner Welt 7): Tests und Kennzahlen

`tests/course_w7_enemies.mjs` (Port 4690, `?course=0-27|0-28&scale=2&adapt=0`, deterministisch über `step(n)`/`setInput`;
Hilfen `window.__t`: `Z(r, dz)`, `place`, `stomp`, `touch`, `until`, `hold`, `face`, `sichel(e)` (Treffer wie die Wurfsichel des
Motors), Boss: `enter`, `untilState`, `grab`, `throwAt`, `follow`, `untilB`, `kickBack`; `W7E_PART=1|2|3|4`, je Teil
≈ 1 min, Teil 4 mit Bildern ≈ 5,5 min, vorher `npm run build`): Laden (alle Arten, Modelle ohne Platzhalter, 10 s ohne Fehler) · Teil 1
Knochenflieger (Kreis r 3, Ankündigung → Sturzflug durch die Figur → zurück, Pilz-Maske, Draufspringen, Bahn, Feuer/Sichel,
seitlich), Platschfisch (verborgen, Bogen 2,6 m, von oben heiß, Spucken, Feuer prallt ab, zielend, endlos ≤ 3 gleichzeitig),
Lavadrache (verborgen, Zyklus, Feuerbälle landen bei der Figur, Kopf/Hals heiß, blau mit 2 hp), Wutkaulquappe (Platz,
Anschwimmen → Aufblasen → Stoß, bleibt im Wasser, Angriff/Draufspringen, Kreis), Funkenflämmchen (Hüpfer, Kanten, heiß,
Jäger, Wasser) · Teil 2 Bumerang-Werfer mit Gegner-Sichel (trifft, fängt, lässt das Power-up fallen, auch nach Lava), blaue
Feuer-Werfer, echte Wurfsichel gegen einen Knochenflieger, Bestand (Stachelpanzer, Zauberkröte, Pilzlingsturm,
Hammer-Werfer), Rammfisch (groß, kreisend, auf und ab, Stern in der Blase), Wurfsichel bei 61 Gegnerarten + Sonderfälle ·
Teil 3 heller König (Platschfische 2 → 3 → 4, Steg frei, 3 Brocken-Treffer, Sieg), blauer Prinz (3 → 4 → 5 blaue Kugeln in der
Kurve, 3 Tritte), Baron (Straße, Autoscroll 14,4 m in 6 s und Schieben, Bomben nie in Lücken, Sprung über die Lücke,
7 Kick-Treffer + echte Wurfsichel 2 Kratzer = 1 Treffer, kurze Lunten, Feuerstoß, Phasen-Ansagen, Flucht, Stern, Warp-Box →
Ziel), Stachelfalle, Tod im Kampf setzt Baron und König zurück · Teil 4 Bilder `tests/out/w7e_*.png` (20) und Zeichenaufrufe
– 64 Prüfungen (25 + 12 + 24 + 3, dazu je Lauf 5 für Laden und Konsole). Gemessen (scale 2, inkl. Schattenpass): Gegnerzoo
38–61 Zeichenaufrufe (≤ 286 k Dreiecke, Thema lava), Bossarenen 50–83 (≤ 242 k, Thema lavacastle); Simulation im Zoo
(38 Entitäten) 0,1–0,34 ms je Schritt. Regressionen `course_enemies`, `course_w1_combat`, `course_w2_enemies`,
`course_w3_enemies`, `course_w4_enemies` (zoo, boss), `course_w5_enemies` (2), `course_hw_enemies` (1), `course_w6_enemies`
(1–4), `course_w7_blocks` (ohne Bilder), `course_physics`, `tests/sfx_namen.mjs` bestanden.

## Präzisierung (Motor-Feinschliff nach Welt 6)

Ergänzung des Motor-Agenten nach Welt 6: die Motor-Schwächen, die die Level-Agenten der Welten 5, 6 und der Halloween-Welt
gefunden und level-lokal umgangen haben, sind jetzt allgemein im Motor behoben. Alles ist additiv; **kein Level wurde
geändert** – die level-lokalen Umwege bleiben und sind harmlos (Liste unten). Prüfung `tests/course_motor_fixes.mjs`.

### Präzisierung (Motor-Feinschliff nach Welt 6): Dateien

```
src/course/view/EntityInstancer.js     + Regeln je Art (LEVEL.instances[kind]: shadow, shadowDist), Schatten-Stellvertreter
                                         (shadowStandIn), addModel (Baustein-Modelle wie Entitäts-Modelle instanzieren)
src/course/view/lod.js                 + Detailstufe stachelkugel/stachelkugel_wurf, shadowStandIn(geometry)
src/course/view/Culling.js             + mesh.__noSun (Regel der Art: in diesem Bild kein Schattenpass)
src/course/view/CourseView.js          + view.instanceModel(root, kind); instanceRule gilt auch für Entitäts-Arten
src/course/view/CameraRig.js           + Kamerastrahl mit echter Form (raycastCam), kleine frei stehende Hindernisse
src/course/physics/shapes.js           + segmentShape (Rampe als Keil, Zylinder rund), Formflag ballPass
src/course/physics/CollisionWorld.js   + raycastCam(a, b, skip)
src/course/level/Level.js              + farHide je Art (LEVEL.instances[kind].farHide), Pilz-Maske in der Luft robust
src/course/player/Player.js            + poundCarry (Stampfattacke fährt mit dem Träger)
src/course/entities/kinds/w6_gimmicks.js   Wurfball: Hangabtrieb in kurzen Luftphasen (slopeAir), ballPass
src/course/entities/kinds/fireball.js, geschosse.js, projektilkopf.js, stachelwerfer_w6.js   ballPass (je eine Zeile)
src/course/entities/EnemyW2.js         sharedSlot: eigene Gruppe je opts (z. B. { color })
src/course/entities/kinds/wuerfelblase_w6.js   Gelee-Brocken ohne Boss in ihrer Farbe
src/course/entities/kinds/werferturm_w5.js    Reiter-Spec mit kind und spawnedBy
src/course/archetypes/kinds/arena.js   Neustart: Specs mit spawnedBy überspringen, Reiter (e.rider) mitzählen
src/course/blocks/types/switchtiles.js Felder über view.instanceModel (eine Instanz-Gruppe)
src/course/blocks/types/w5_flipper.js  Flipper-Instanzen über view.groupCull (nur Felder im Bild)
src/course/blocks/types/w3_snow.js     eisflaeche: sparsame Eiskante, Standard an bei Eisseen mit Sockel
src/course/levels/w0/0-29.js           Testlevel „Motor-Werkbank“ (eine Station je Punkt, marks)
src/course/levels/w0/0-30.js           Testlevel „Werferturm-Arena“ (Arena ohne level-lokale Hilfe)
tests/course_motor_fixes.mjs           Port 4700, PARTS=inst,pound,cam,ball,eis,maske,gelee,w5,kraft,arena,level
```

### Präzisierung (Motor-Feinschliff nach Welt 6): was der Motor jetzt selbst kann

1. **Instanz-Regeln für alle Arten.** `LEVEL.instances[name]` bzw. `view.instanceRule(name, rule)` galten bisher nur für
   Instanz-Gruppen (EnemyW2 `sharedSlot`, `modelInstances`) und Pools (Münzen). Jetzt auch für Entitäts-Modelle nach Art
   (`kind`): `shadow: false` – kein Sonnenschatten, `shadowDist: m` – weiter als m (waagerecht) von der Haupt-Figur kein
   Sonnenschatten (je Exemplar; eine Art mit Regel zeichnet auch als einzelnes Exemplar über die Instanz-Gruppe, nicht
   instanzierbare Teile überspringen nur den Schattenpass), `farHide: m` – Level.render blendet das Modell aus (vor
   `LEVEL.farHide`, nach Entität/spec `farHide`). Beispiel (statt `schattenNah` in 6-1):
   `instances: { stachelkugel: { shadowDist: 11 } }`. Schatten-Regeln wirken mit `view.optimize` (wie die Instanzen).
   **Stachelkugel** (Registry-Modell ≈ 5,7 k Dreiecke): ab 24 m Kameraabstand zeichnet die sparsame Kugel derselben
   Bibliothek (≈ 0,7 k, gleiche Farben und Stacheln, `view/lod.js`), im Schattenpass immer (Schatten-Stellvertreter
   `shadowStandIn`, gilt auch für `stachelkugel_wurf`). Im Testlevel (acht Kugeln): Hauptpass 1 Aufruf / 45,8 k,
   Schattenpass 1 Aufruf / 5,7 k (vorher wie der Hauptpass, ≈ 46 k); aus der Ferne 1 Aufruf / 5,7 k.
   **Achtung:** Regeln, die Level schon für Entitäts-Arten eingetragen hatten und die bisher wirkungslos waren, greifen
   jetzt wie gedacht – 5-1 (`krabbelkaefer`, `panzerkroete`, `rammbock_bulle`, `muenzmarder`: farHide/shadowDist) und 6-3
   (`pilzling`, `krallen_pilzling`, `stachelwerfer`, `pilz_maske`, `helm_maske`, `schluesselmuenze`: kein Sonnenschatten;
   die Blob-Schatten bleiben). Routen beider Level geprüft.
2. **Stampfattacke auf fahrenden Trägern** (`Player.poundCarry`): während der Stampfattacke (Drehung und Fall) übernimmt die
   Figur waagerecht die Geschwindigkeit der obersten Form mit `mover` unter ihr (bis 40 m tiefer: Plattform `mover`,
   `vehicle` – Panzer, Zugwaggon, Flachwagen –, Floß/`MovingBox`, Kipp-Schaltfelder auf Plattformen) und landet senkrecht
   über dem Ziel auf dem Träger (gemessen: Drift < 0,1 m statt ≈ 2 m bei 3 m/s). Über festem Boden unverändert senkrecht.
   Hat ein Level-Haken die Figur im selben Schritt schon mit dem Träger verschoben (6-Panzer `kolonnenSetup`), zählt diese
   Verschiebung entlang der Fahrtrichtung mit – nicht doppelt. Drehscheiben (`dyaw`) drehen die stampfende Figur nicht mit.
3. **Kamerastrahl mit echter Form** (`CollisionWorld.raycastCam`, nur Darstellung – Spiel-Abfragen nutzen weiter `raycast`):
   Rampen verdecken nur unter ihrer Schräge (nicht mehr als Hüllquader – an Hängen rückt die Kamera nicht mehr bis 3 m
   heran), Zylinder nur rund. **Kleine, frei stehende Hindernisse** (alle Kanten ≤ 2,2 m, seitlich ohne feste Nachbarn –
   ein einzelner ?-Block, Ziegel, eine Kiste) bis 5 m vom Kopf der Figur ziehen die Kamera nicht mehr ruckartig heran;
   Reihen und Mauern aus Blöcken zählen weiter (Kamera rückt heran). `camIgnore` auf Rampen ist nicht mehr nötig.
4. **Wurfball am Hang:** der Hangabtrieb wirkt auch in kurzen Luftphasen (Hüpfer) – bis `slopeAir` s (Standard 0,35)
   nach dem letzten Hang-Kontakt, solange die Rampe höchstens 0,6 m unter dem Ball liegt und er nicht steigt
   (`vel.y < 2`). Datenfeld `{ kind: 'wurfball', slopeAir: 0 }` = altes Verhalten. Gemessen am 31°-Hang (6 m hoch, 10 m
   lang): unten nach 2,2 s mit 6,5 m/s (mit `slopeAir: 0` nach 3 s noch nicht unten, höchstens 1,9 m/s).
5. **Eiskante sparsam** (`eisflaeche`): Nachbildung des Modells `eiskante` (Eis-Lippe, Saum, Schneewulst mit Buckeln im
   Takt des Modells und mit dessen Kugel-Normalen) – ≈ 130 statt ≈ 500 Dreiecke je Meter (ein 16 × 40-m-See ≈ 14 k statt
   ≈ 56 k je Pass, mit Schattenpass ≈ 29 k statt ≈ 110 k). **Standard:** an bei Eisseen mit Sockel (h > 0,2), aus bei
   flachen Bahnen ohne Sockel (wie bisher, z. B. der Teich in 3-1, der seinen Schneerand selbst mitbringt); `edge: false`
   aus, `edge: true` an, `edge: 'fein'` = Registry-Modell wie bisher. Die Level mit Eisseen (6-5, Hilfe `w3/_helpers_a.js`)
   setzen `edge: false` ausdrücklich und bleiben unverändert; 0-13 (`edge: true`) zeigt jetzt die sparsame Kante.
6. **Pilz-Maske in der Luft** (`level.isMaskedFrom`): über dem Gegner (waagerecht höchstens Halbbreite des Gegners +
   Halbbreite der Figur + 0,3 m) gilt die maskierte Figur in der Luft als zugewandt, und war sie eben noch zugewandt, hält
   das in der Luft 0,35 s nach (Sprung über die Mitte eines Stachelwerfers: er wirft nicht mehr). Am Boden unverändert.
7. **Gelee-Brocken ohne Boss** übernehmen `color` aus den Daten (eigene Instanz-Gruppe je Farbe über
   `sharedSlot(level, name, { color })`; vorher alle silbern). 6-C zeigt die fünf Brocken jetzt in ihren Farben.
8. **Welt 5:** Kipp-Schaltfelder (`switchtiles`) zeichnen als eine Instanz-Gruppe (`view.instanceModel`; Farbfeld 3 × 3:
   1 Aufruf statt 9). Rot-Blau-Flipper melden ihre Instanz-Meshes bei `view.groupCull` an (Name `flipper`, Regeln über
   `LEVEL.instances.flipper`): je Bild nur Felder im Bild bzw. mit Schatten ins Bild (vorher immer alle, ≈ 60 k Dreiecke
   in 5-6). **Werferturm:** die Reiter-Spec hat `kind` und `spawnedBy: 'werferturm'`; der Arena-Neustart überspringt Specs
   mit `spawnedBy` und zählt den Reiter des neuen Turms (`e.rider`) mit – genau ein Werfer, keine Warnung
   „unbekannte Entität“.
9. **Formflag `ballPass`** (Kraftfeld „nur Bälle“): `{ type: 'box', …, ballPass: true }` ist fest für Figuren und Gegner;
   Wurfball, Feuerball der Figur, Gegner-Feuerkugeln (`geschosse.js`), Projektilkopf und geworfene Stachelkugel fliegen
   hindurch. Als Wand gedacht, nicht als Boden (rollende Geschosse fielen hindurch). Die Wurfsichel (Welt 7) fliegt ohnehin
   durch Wände; geworfene Kickbomben/Panzer sind nicht erfasst.

API-Ergänzungen: `view.instanceModel(root, kind) → Abmelden` (Baustein-Modell, das direkt in der Szene hängt, wie ein
Entitäts-Modell instanzieren), `view.instancer.stats` + `ruled` (Exemplare mit Regel), `shadowLow` (Schatten über den
Stellvertreter), `world.raycastCam(a, b, skip?)`, `segmentShape(shape, …)`.

### Präzisierung (Motor-Feinschliff nach Welt 6): level-lokale Umwege, die jetzt überflüssig sind (bleiben harmlos)

| Level | Umweg | jetzt im Motor |
| --- | --- | --- |
| 6-1 | `schattenNah(level, ['stachelkugel'], 11)` | `instances: { stachelkugel: { shadowDist: 11 } }`; Schatten ohnehin über den sparsamen Stellvertreter |
| 6-Panzer | `kolonnenSetup`: Figur beim Stampfen mit dem Panzer verschieben | `poundCarry` (der Haken wird erkannt, nichts doppelt) |
| 6-5 | `rampenKameraFrei` (camIgnore auf allen Rampen) | `raycastCam` (Rampen als Keil) |
| H-1 | Hilfe `rampe` (Rampe mit camIgnore) | dito |
| 6-5 | `eisflaeche` mit `edge: false` (Budget) | sparsame Kante (≈ 14 k je 16 × 40-m-See und Pass) – ohne `edge` stünde sie an |
| 6-Haus | `kullerRinne` (Hangabtrieb je Schritt) | Wurfball-Hangabtrieb in Luftphasen; die Zentrierung in der Rinne bleibt Sache der Hilfe |
| 6-Haus | `kraftfeld` als `solid` + `trigger` (der Ball übergeht `trigger`) | Formflag `ballPass` |
| 5-B | `arenaTowerFix` | Reiter-Spec mit `kind`/`spawnedBy`, Arena zählt den Reiter |
| 5-5 / 5-6 | — (Wünsche: Farbfeld instanzieren, Flipper-Culling) | `view.instanceModel`, `view.groupCull` |

### Präzisierung (Motor-Feinschliff nach Welt 6): Test und Kennzahlen

`tests/course_motor_fixes.mjs` (Port 4700 + `PORT_BASE`, deterministisch über `step`/`setInput`; `PARTS=inst,pound,cam,
ball,eis,maske,gelee,w5,kraft,arena,level`, alle zusammen ≈ 2 min, `VERBOSE=1`) – 37 Prüfungen, je Punkt mit Gegenprobe:
Stachelkugeln als eine Gruppe, Schatten über den Stellvertreter, `shadow: false`, `shadowDist` (nur die nahen), `farHide`
je Art, Detailstufe aus der Ferne · Stampfen auf Plattform und Wagen (Drift < 0,3 m), Umweg wie 6-Panzer nicht doppelt,
feste Plattform senkrecht · Kamera an der Rampe und hinter einem ?-Block voller Abstand (alter Hüllquader-Strahl war
verdeckt), Ziegelreihe zieht heran · Wurfball mit/ohne `slopeAir` · Eiskante sparsam ≤ ⅓ des Modells, Standard an/aus ·
Pilz-Maske über dem Stachelwerfer (alte Blickregel und ohne Maske: er wirft) · Gelee-Farben · Farbfeld 1 Aufruf,
Flipper außerhalb 0 Aufrufe · Kraftfeld (Figur hält, Ball und Feuerball hindurch, Glaswand hält beide) · Werferturm-Arena
0-30 und 5-B · echte Level 5-5, 5-6, 6-1.

Kennzahlen (`tests/course_perf.mjs`, scale 2, `?still=1`, inkl. Schattenpass; vorher = master vor dem Feinschliff):

| Level | Aufrufe Ø (max) vorher | nachher | Dreiecke Ø (max) vorher | nachher |
| --- | --- | --- | --- | --- |
| 6-1 | 61,2 (93) | 61,2 (93) | 199 k (262 k) | 197 k (262 k) |
| 5-5 | 73,2 (97) | 72,4 (97) | 170 k (229 k) | 170 k (229 k) |
| 5-6 | 58,5 (80) | 53 (72) | 187 k (234 k) | 129 k (174 k) |
| 6-5 | 35 (45) | 35 (45) | 110 k (153 k) | 110 k (153 k) |

Messgang entlang der Route (Lotti, Höchstwerte vorher → nachher): 6-1 98 → 98 Aufrufe / 258 → 249 k, 5-5 99 → 99 /
208 → 208 k, 5-6 105 → 97 / 249 → 189 k, 6-5 55 → 55 / 148 → 148 k. Einzelne Stellen: 5-5 Farbfeld (Empore) 109 → 101
Aufrufe (Felder 9 → 1), Bild am Stern 2 91 → 83; 5-6 Checkpoint 98 → 90 Aufrufe / 234 → 174 k (Flipper 8 Aufrufe / 60 k
→ 0), Start 153 → 99 k; 6-1 ferne Stachelkugeln in der Detailstufe (≈ 0,7 statt 5,7 k); die Glasgang-Kugeln liegen nah (volle Kugel), und
6-1 sparte den Kugel-Schatten schon selbst (`schattenNah`) – daher dort nur wenig Gewinn; 6-5 unverändert (Kante dort
ausdrücklich aus, Rampen schon mit `camIgnore`; mit `edge` an kosteten die drei Seen jetzt ≈ 14 + 15 + 17 k je Pass statt
je ≈ 110 k mit Schattenpass).

Regressionen (nacheinander, je ≤ 10 min) bestanden: `course_physics`, `course`, `course_view`, `course_leistung`,
`course_w3_blocks` (ohne Bilder), `course_w5_blocks`, `course_w6_blocks` (mech), `course_w6_enemies` (1–4), `course_w5c`
(5-5 und 5-6 route/sweep/targets/extra, 5-B), `course_w6a` (6-1, 6-2 load/route/targets, 6-1 sweep, 6-B arena),
`course_w6b` (6-3 load/route/targets/extra), `course_w6c` (6-5, 6-6 load/route/targets, 6-5 sweep, 6-Haus
haus/haus-extra), `course_w6d` (6-7, 6-Panzer, 6-C load/route/targets), `course_w2d` (2-Panzer), `course_hwa` (H-1, H-2
load/route, H-1 sweep: höchstens 85 Aufrufe / 284 k), `course_w5a` (5-1
load/route), nach dem Merge der Welt 7 `course_w7_blocks`, `course_w7_enemies` (1–3).

## Präzisierung (Level 7-1, 7-2 und 7-A)

Additiv zur Welt-7-Liste: Titel und Besonderheiten der Level 7-1, 7-2 und 7-A. Dateien `src/course/levels/w7/7-1.js`, `7-2.js`,
`7-A.js`, eigene Hilfen `src/course/levels/w7/_helpers_a.js` (kein `LEVEL`, nur für diese drei Level; nutzt `Bld`, `litTop`,
`gradY`, `blueLavaSea`, `blueFalls`, `sparksUp`, `bats` aus `w5/_helpers_b.js` und die Lava-Insel-Hilfen aus `w4/_helpers_c.js`),
Test `tests/course_w7a.mjs`. **Kein Motor-Code geändert**; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.build`/`LEVEL.setup`). Bausteine nach „Präzisierung (Motor und Bausteine Welt 7)“, Gegner nach „Präzisierung (Gegner
Welt 7)“.

### 7-1 „Werferburg am Blauglutsee“ (parcours · bluelava · course_fortfire · 400 s)

- Festung aus blaugrauem Ziegelstein im Blauglutsee (Lava y −0,6, Boden y 1), ≈ 250 m nach −Z. Abschnitte: **Startinsel**
  (Burghof mit Pilzlingsturm, ?-Block mit der **Wurfsichel**; die **H-Röhre** – zwei Glasröhren mit Quersteg – quert den
  Lavagraben) → **Glasröhren-Netz** (Werfer-Hof, Röhrengabel hoch über der Lava zu zwei Werfer-Inseln, Röhrenstern zurück zur
  Hubinsel) → **Feuerstab-Plattformen** (zwei `feuerstab`, der zweite mit ?-Block und `lift`; Werferturm-Platz: Feuer-Werfer
  auf einem Pilzlingsturm (`werferturm`) – besiegt erscheint die Warp-Box über den Glutsee) → **Stampfstein-Passage**
  (Kontrollpunkt, Gang zwischen Zinnenmauern mit drei Stampfsteinen und drei Marschblock-Kolonnen; der letzte Feuer-Werfer am
  Torplatz – fällt er (`task`), senkt sich die **Zugbrücke** zur Zielinsel mit Hoppel im Käfig des Barons).
- Sterne: 0 im **Quersteg der H-Röhre** (an der Kreuzung abbiegen; Glasröhren sammeln sonst nur Münzen – `sternImRohr` holt
  den Stern beim Durchfahren) · 1 **Kugelsaal** (x ≈ 72): unsichtbare Blöcke direkt nach dem Kontrollpunkt (Kopfstoß, dann
  Kette) hinauf auf den Turm, grüne Röhre in den Saal, die Kugel über die Kugelbahn (Bordsteine) in die Mulde rollen
  (`kugelZiel`: nur die Kugel löst aus) · 2 **Sternenring** auf der Hubinsel: acht Sternmünzen in 13 s rund um die erste
  Feuerstab-Plattform, die letzte oben auf ihrem Steinblock. Stempel: Stampfen auf den ?-Block im zweiten Feuerstab hebt ihn
  4,2 m an – von dort zum Stempel (ohne Anheben zu hoch).
- Extraleben: unsichtbarer Block neben dem Starttor, unsichtbarer Block im Kugelsaal. Funkenblüte auf der Hubinsel,
  Wachstumsbeere am Kontrollpunkt.
- Gegner: Feuer-Werfer 6 (alle mit `fireColor: 'blau'`; der Werfer auf dem Turm bekommt die Farbe im Setup), Lavablase 22,
  Pilzlingsturm 4 (3 + `werferturm`), Feuerstab 2, Stampfstein 3, Marschblock 12.
- Kulisse (`festung71`): Ziegelfassaden an allen sichtbaren Inselseiten mit leuchtendem Saum an der Lava, Zinnenmauern mit
  Schießscharten, bunte Rundtürme (auch fern auf Basaltsockeln, aus ihren Fenstern stürzen blaue Lavafälle), Steinplatten im
  Verband mit glimmenden Rissen, Brummbär-Wappen als Bodenmosaik, rote Läufer, Werfer-Lager (Feuerkugel-Körbe, Fässer),
  Banner, Fackeln, Fledermäuse, Glutfunken.

### 7-2 „Schaltfelder im Finstertempel“ (parcours · darkruins · course_switchruins · 400 s)

- Versunkener Sandstein-Tempel mit türkisen Friesen und leuchtenden Runen über einem finsteren Abgrund (Absturz y −12),
  ≈ 230 m nach −Z. Zwischen den Hallen gibt es keinen Weg: erst wenn alle Felder einer `schaltfelder`-Gruppe golden sind,
  ploppen die Wegplatten auf (Umrisse und schwebende Münzen zeigen vorher, wo); Abgründe ≥ 14 m (kein Sprung hinüber).
  Abschnitte: **Eingangshalle und dunkler Gang** (Funkenblüte im ?-Block, Stachelpanzer, Gruppe 1 mit 2 × 2) → **zweiter Saal**
  (zwei Stachelpanzer zwischen den vier Feldern von Gruppe 2) → **Rundsaal** (Mosaik, Säulenring, vier Fackelschalen) →
  **Kontrollpunkt** → Gruppe 3 (3 × 2) unter dem Feuer einer Feuer-Schnappblume, zwei Funkenflämmchen an den Rändern →
  **Fahrplattform** über den Abgrund zur letzten Halle (vier Stachelpanzer, Gruppe 4 mit 3 × 2) → **Zielröhre** (grüne Röhre
  hinüber in die Zielhalle mit steinernen Wächter-Häschen und Schatz).
- Sterne: 0 im Rundsaal: vier **Fackelschalen** mit Feuerbällen der Funkenblüte anzünden (`fackelGruppe`; Anfassen,
  Anspringen, Tatze zünden nicht) – der Stern erscheint in der Mitte · 1 **versteckter Schatzraum** rechts vom Kontrollpunkt
  hinter einer **Scheinwand** (`scheinwand`: ohne Kollision, wird beim Nähern durchscheinend; leuchtende Risse als Hinweis;
  die Mauer daneben ist fest) · 2 hinter der grünen Röhre: ein **unsichtbarer länglicher ?-Block** (`geheimLaengsblock`,
  Kopfstoß) zeigt eine versteckte Blockkette hinauf über den Abgrund. Stempel: im zweiten Saal ganz rechts auf der Plattform
  über dem Abgrund (Anlauf und Sprung).
- Extraleben: unsichtbarer Block im Schatzraum. Gegner: Stachelpanzer 7, Feuer-Schnappblume 1, dazu Funkenflämmchen 2
  (Hinweis aus „Gegner Welt 7“).
- Kulisse (`tempel72`): Quaderfassaden der schwebenden Böden mit Runenleiste, Tempelmauern mit Fries, Säulen mit Runenband,
  Rundsaal-Mosaik, Amphoren, Goldschatz, Leuchtkristalle, Wächter-Häschen (Pflaume aus Stein), Ruinensäulen aus der Tiefe,
  Goldstaub, Glutfunken aus dem Abgrund, Fledermäuse, viele Fackeln (Laternenlicht).

### 7-A „Glutkönig im Platschkessel“ (arena · lava · course_arena · 200 s, 1 Stern)

- Runde Basaltinsel (R 12,4 m, `rockIsland`) im Lavasee 1,4 m unter der Fläche, Kranz aus Basaltpfeilern mit Brummbär-Bannern
  (vorn offen), Glutkrone als Bodenmosaik in der Mitte (dort steigt der Stern auf), Kraterwand mit drei Lavafällen,
  Vulkane, Dampf, Glutfunken. Der **helle Lavafelsen-König** (`variant: 'hell'`,
  `fish` mit `gate` zur Startseite) ruft endlos Lavabrocken und rollt; Platschfische springen rings um den Kessel. Nur
  geworfene Lavabrocken treffen (3×). Arena-Zählung, Lebensleiste „Glutkönig“ und Neustart nach Tod (König zurück, Brocken und
  Fische weg) über `bossKampf` (wie `prinzKampf`, `LEVEL.arena.enemies: []`); der Arena-Stern steigt in der Mitte auf.
- ?-Block mit Wachstumsbeere, Münzblock, unsichtbarer Block mit Extraleben vorn am Rand.

### Hilfen `_helpers_a.js`

Daten: `isl` (Steinplatten-Insel), `line`, `ring`, `arc`, `column`, `sign`, `blase` · Mechanik: `sternImRohr`, `kugelZiel`,
`fackelGruppe` (Entität `fackelschale`, level-lokal), `scheinwand`, `geheimLaengsblock`, `bossKampf` · Festung: `BURG`,
`ziegel`, `mauer`, `turm`, `inselFassaden`, `fliesen`, `wappenMosaik`, `bodenPfeile`, `laeufer`, `werferKram`, `festung71` ·
Tempel: `TEMPEL`, `tempelWand`, `saeule`, `amphoren`, `kristalle`, `schatz`, `pflaumeStatue`, `mosaik`, `tempel72` · Kessel:
`kessel7A`.

### Test `tests/course_w7a.mjs`

Port 4710 (+ `PORT_BASE`), Aufruf `node tests/course_w7a.mjs [7-1|7-2|7-A]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,arena,shots` (je Lauf < 10 min: z. B. `load,route,sweep` und `targets,extra` getrennt),
`HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`, `SHOTS=<Name|…>`, `DETAIL=1`, Bilder `tests/out/w7a_*.png`. Bot mit echter
Eingabe (`setInput`/`step`, Stick relativ zur Kamera-Gier); Beine u. a. `pipe` (Glasröhre, Stick an der Kreuzung), `warp`,
`stompAll`, `clear` (Lücke abwarten), `pound` (Stampfattacke), `roll` (Kugel schieben), `fire` (Feuerbälle auf ein Ziel),
`ride` (Fahrplattform), `tiles` (Schaltfelder), Arena `bossFight` (Brocken betäuben, aufheben, werfen, ausweichen).
Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel (7-1 ≈ 88/76 s mit H-Röhre,
Röhrengabel, Röhrenstern, Feuerstäben am Rand, Werfer auf dem Turm, Warp-Box, Stampfsteinen, Marschblöcken, Zugbrücke; 7-2
≈ 73/72 s **ohne einen Treffer-Versuch**, vier Schaltgruppen, Stachelpanzer mit Feuerbällen, Fahrplattform, Zielröhre; 7-A
Kampf ≈ 27/42 s mit echten Würfen, Platschfische bis zu vier gleichzeitig); alle Sterne und Stempel mit Gegenproben
(Geradeausfahrt, Mulde ohne Kugel, Stempel ohne Anheben, Fackeln ohne Feuer, Blockkette ohne Kopfstoß, 3 von 4 Feldern); Extras
(versteckte Warp-Box, geschlossene Zugbrücke, Wurfsichel, feste Mauer neben der Scheinwand, vier Extraleben); 7-A: Feuer und
Draufspringen schaden dem König nicht, Tod setzt den Kampf zurück, Zeitlimit 200 s. Gemessen (scale 2, inkl. Schattenpass,
Messgang alle ~7 m der Route und Bilder je Abschnitt): 7-1 30–84 Zeichenaufrufe / ≤ 198 k Dreiecke · 7-2 35–79 / ≤ 127 k ·
7-A 45–75 / ≤ 135 k.

## Präzisierung (Level 7-3, 7-4 und 7-B)

Additiv zur Welt-7-Liste: Titel und Besonderheiten der Level 7-3, 7-4 und 7-B. Dateien `src/course/levels/w7/7-3.js`, `7-4.js`,
`7-B.js`, eigene Hilfen `src/course/levels/w7/_helpers_b.js` (kein `LEVEL`, nur für diese drei Level; reicht `isl`, `line`,
`ring`, `arc`, `column`, `sign`, `prinzKampf` aus `w6/_helpers_b.js`, `wimpelkette` aus `w6/_helpers_a.js` und `Bld`, `litTop`,
`gradY`, `glowPoints` aus `w5/_helpers_b.js` weiter), Test `tests/course_w7b.mjs`. **Kein Motor-Code geändert**; alle
Sonderteile sind level-lokal (Hilfsdatei, Haken `LEVEL.build`/`LEVEL.setup`). Bausteine nach „Präzisierung (Motor und Bausteine
Welt 7)“, Gegner nach „Präzisierung (Gegner Welt 7)“.

### 7-3 „Pfeilflitzer über dem Glutstrom“ (parcours · lavarun · course_redhot · 100 s)

- Rennstrecke aus Basalt-Dämmen hoch über dem Glutstrom (Wege y 2/5/8, Ziel y 11; Kulissen-Lava y −9 mit Tötungsfläche
  `lavaGrund`), ≈ 480 m nach −Z, **genau 56 Boost-Pfeile** (`pfeile`: Auslöser `boost` + flache Platten + ein InstancedMesh
  mit Lauflicht-Chevrons; vor Slaloms und Röhreneinfahrten keine bzw. schräge Pfeile, die in die Röhre lenken). Abschnitte:
  **Start** (Renn-Torbogen mit Karo-Band, Tribünen, Startlinie, ?-Block mit Wurfsichel) → **Rasstrecke 1** (3-m-Damm mit
  Pfeilen und Lücke → Donut-Brücke → Walzen-Slalom → Glasröhre 1 hinauf → Gabelung aus drei Wegen: links Donut-Blöcke, Mitte
  Pfeile und Lücke, rechts zwei Walzen → Kontrollpunkt 1) → **Rasstrecke 2** (Sternring auf dem Pfeil-Damm → Grubenplateau →
  linker Abzweig über eine Lücke zum Stempel → Donut-Brücke → Walzen-Slalom → Glasröhre 2 → Gabelung: links Pfeile und Lücke,
  Mitte drei Walzen, rechts Donuts → Kontrollpunkt 2) → **Dreifach-Gabelung** (links Donut-Zickzack, Mitte Pfeile und Lücke,
  rechts Walzen-Slalom; jeder Weg endet in einer Einbahn-Glasröhre aufs Zielplateau mit Zieltor, Tribünen, Karo-Flaggen).
- Sterne: 0 am Ende des **rechten Wegs** der ersten Gabelung (über zwei Stachelwalzen) · 1 **Sternring** (acht Sternmünzen
  den Pfeil-Damm entlang, 10 s, die letzten zwei über eine kleine Rampe auf einem Sims; der Stern erscheint über der Grube) ·
  2 am Ende des **Mittelwegs** der zweiten Gabelung (durch drei Walzen). Stempel: linker Abzweig kurz nach Stern 1 auf einer
  Insel hinter einer Lücke; zurück mit einem Sprung auf den Hauptweg.
- Geheimnis: in der **Grube** (wo Stern 1 erscheint) eine grüne Röhre ins **Pilzling-Versteck** (x ≈ 140, ummauerter Glut-Hof
  mit 24 Pilzlingen, die Münzen fallen lassen; ?-Block mit **Funkelstern**, Münzblock, Münzringe, Röhre zurück aufs
  Grubenplateau). Extraleben: unsichtbarer Block auf dem ersten Gabelungsplateau, unsichtbarer Block im Versteck.
- Bausteine: Stachelwalze 13 (`stachelwalze_rot`, liegend auf Eisenböcken), Donut-Blöcke 116 in drei Gruppen, Glasröhren 5,
  Röhren 4. Gegner: Pilzling 24 (nur im Versteck). Die Donut-Blöcke nutzen die Mechanik von `donutblock`, zeichnen aber ein
  eigenes Low-Poly-Instancing (`donutBloecke`: Baustein-Ansicht abgehängt) – das Standardmodell hätte 116 × 4,5 k Dreiecke
  ohne Frustum-Culling gekostet.
- Kulisse: leuchtende Mittelstreifen und Randpfosten auf den schmalen Dämmen (`fahrbahn`, ohne Kollision), Karo-Linien an
  Start und Ziel, Wimpelketten, Basaltwände und -säulen, Lavafälle, Glutrisse, Glutfunken, Fackeln, Knochen, Leitwände an den
  Röhrenmündungen (`bruestung`).

### 7-4 „Schubser-Rummel im Blauglutkessel“ (parcours · bluelava · course_bluebelt · 400 s)

- Festungskessel mit blauem Lavasee (ein `lavaspiegel`, y 0) und kleinen Steinbauten (Oberseite y 1,5) mit Zinnen,
  Goldkappen und blau glühenden Fenstern (`festungRand`), ≈ 230 m nach −Z. Abschnitte: **Start** (Festungshof, Sternring,
  ?-Block mit Wurfsichel) → **Pfeilplattformen** (sieben `pfeilplattform` `style: 'blau'` tauchen aus der Lava auf und
  versinken; Steinbau A mit zwei Pendelstacheln, B mit Schubser und zwei Walzen, C mit zwei Walzen und der Rätselbox,
  Steinbrücke mit zwei Pendelstacheln, D mit Kontrollpunkt und einer Walze) → **Zylinderzone** (Zylinder 1 → E mit zwei
  Walzen → drei Pfeilplattformen fahren aus einer hohen Mauer (`from: 'wand'`) → F mit Schubser und einer Walze → Zylinder 2
  mit zwei Stachelreihen → G mit zwei Pendelstacheln → Zylinder 3 → H mit zwei Walzen → Zylinder 4 → I mit zwei Walzen und
  der Röhre zum Finale) → **Finale** (x ≈ 60, Kontrollpunkt 2 am Röhrenausgang: zwei Walzen → **Kippplattform** mit drei
  Schubsern – alle in die Lava gestoßen (`task`, Belohnung `reveal`) tauchen drei Pfeilplattformen `mode: 'signal'` zum
  Zielhof auf).
- Sterne: 0 **Sternring am Start** (acht Sternmünzen auf Hof, zwei Seitensäulen und in zwei Sprüngen, 15 s) · 1
  **Rätselbox** hinter den Walzen von C (`warpbox` in den Raum bei x ≈ 100; den Schubser in die Lava stoßen → Stern; zurück
  per Warp-Box) · 2 auf einem **Sims** rechts neben Zylinder 3 (vom Zylinder seitlich hinüberspringen). Stempel: kleine runde
  Plattform (`rundPlatte`) links vor der Rätselbox.
- Extraleben: unsichtbarer Block über Steinbau B, unsichtbarer Block am Röhrenausgang des Finales; zweiter ?-Block mit
  Wurfsichel und Münzblock am Kontrollpunkt. Auf C und D je ein Podest unter dem Knochenflieger – von dort springt man über
  ihn und stampft ihn.
- Gegner: Schubser 6 (B, F, Rätselbox, drei auf der Kippplattform; `guard`/`chase`), Knochenflieger 5 (`center` + `radius` 3,
  y + 3,8 über C, D, E, H, I – Kreise abseits der Sprungbögen), Lavablase 8 (blau). Bausteine: Stachelwalze 14, Pendelstachel 6
  (blau), Zylinder 4 (`style: 'blau'`, einer mit Stacheln), Pfeilplattform 13, Röhren 2 (blau).
- Kippplattform: `kippPlatte` nutzt die Mechanik der Wippe aus `w6_ship` (`TYPES.wippe`, Ansicht abgehängt) mit eigener
  Platte (Warnstreifen, Runenring) und Lagerbock; 14 × 8 m, Neigung bis 7°.

### 7-B „Blaufeuer-Prinz im Glutzwinger“ (arena · fortress · course_arena · 300 s, 1 Stern)

- Basalt-Festung hoch über dem Lavasee; in der Mitte der **Glutzwinger** (`glutZwinger`, Innenfläche 20 × 20 m): Basaltplatten
  mit glühenden Fugen, roter Läufer, blau leuchtendes Flammenkronen-Mosaik, Eisenstäbe mit glühenden Spitzen, vorn nur eine
  Brüstung mit Fallgitter-Tor (Kamera sieht alles), an beiden Seiten je drei Röhrenmündungen unter Torbögen mit blauen
  Feuerschalen; die Glasröhren (Netz `roehren`, für die Figur gesperrt) laufen hinter dem Käfig herum. Unsichtbare
  Käfigkollision samt Decke. Tribünen mit Zuschauern, vier Festungstürme (`look: 'eigen'`), blaue Fackeln, Lavafälle.
- Ablauf nach `prinzKampf` (wie 6-A): Tor schließt sich, Lebensleiste „Blauer Schubser-Prinz“; `schubser_prinz` mit
  `color: 'blau'`, `fire: [3, 4, 5]`, `curve: 1.1`. Drei Tritte nach Röhrenfahrten, dann steigt der Stern in der Mitte auf;
  Tod: Neustart vor dem Tor, Prinz wieder 3/3.
- ?-Block mit fünf Münzen, Münzblock, unsichtbarer Block mit Extraleben vor dem Tor; Münzringe in den vier Ecken.

### Hilfen `_helpers_b.js`

Lava und Strecke: `lavaGrund`, `stuetzen`, `pfeile`, `karoV`, `karoLinie`, `startTor`, `fahrbahn`, `flaggen`, `lavaRinne`,
`basaltWand`, `glutfunken`, `bruestung` · Mechanik mit eigener Ansicht: `donutLowGeo`, `donutBloecke`, `kippPlatte`,
`rundPlatte` · Festung: `festungRand`, `crownShape`, `glutZwinger`.

### Test `tests/course_w7b.mjs`

Port 4720 (+ `PORT_BASE`), Aufruf `node tests/course_w7b.mjs [7-3|7-4|7-B]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,shots` (je Lauf < 10 min; 7-4 am besten `load,route,sweep` und `targets,extra,shots`
getrennt), `HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`, `TRACE=1`, `SHOTS=<Name|…>`, `DETAIL=1`, Bilder
`tests/out/w7b_*.png`. Bot mit echter Eingabe (`setInput`/`step`, Stick relativ zur Kamera-Gier), auf der Route unverwundbar,
Treffer-Versuche werden gezählt; Beine u. a. `pipe` (Glasröhre), `crouch` (Röhre), `warp`, `push` (Schubser in die Lava
stoßen, mit Ausweichen vor weiteren Schubsern), `waitPlat` (Pfeilplattform), `waitPend` (Pendelstachel), `waitZyl`
(Stachelreihe), `fight` (Prinz mit Röhrenfahrt und Feuerball-Sprüngen), `stompAll`, `stompBoss`, `chaseKind`;
Knochenflieger-Reflexsprung im Sturzflug-Fenster.
Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegner- und Bausteinzahlen (56 Pfeile, 13/14 Walzen, 6 Pendel, 4 Zylinder,
13 Pfeilplattformen, 24 Pilzlinge, 6 Schubser, 5 Knochenflieger); Routen-Bot Lotti und Greta Start → Ziel **ohne einen
Treffer-Versuch** (7-3 ≈ 38/38 s mit 33 Boosts und drei Röhrenfahrten; 7-4 ≈ 107/146 s mit fünf Schubsern in der Lava; 7-B
Kampf ≈ 33 s mit drei Röhrenfahrten und drei Tritten); alle Sterne und Stempel mit Gegenproben (Mittelweg statt rechtem Weg,
über die Grube ohne Sternring, linker statt mittlerer Weg, Stempel nicht vom Hauptweg, Hof ohne Sternring, Rätselbox ohne
Stoß, Überqueren des Zylinders ohne Seitensprung, Weg über C); Extras (Versteck mit Funkelstern und Pilzlingen, fünf
Extraleben, Donut-Blöcke fallen in die Lava, Zeitlimit 100 s, Walze und Pendel verletzen, Pfeilplattform versinkt mit der
Figur, Zylinder dreht zur Kamera, Kippplattform neigt sich, Knochenflieger vom Podest besiegt, Kippplattform-Aufgabe,
7-B: Tor und Lebensleiste, 3/4/5 blaue Feuerbälle, Abprall ohne Röhre, Tod setzt den Kampf zurück). Gemessen (scale 2, inkl.
Schattenpass, Messgang alle ~8 m der Route und Bilder je Abschnitt): 7-3 38–73 Zeichenaufrufe / ≤ 186 k Dreiecke · 7-4
39–94 / ≤ 199 k · 7-B 47–80 / ≤ 254 k.

## Welt 8 – Level-Liste und Freischaltung (Hauptsitzung)

Welt 8 „Brummbär-Rummelplatz“ (Erzfeind-Vergnügungspark, dunkles Baron-Land mit Rummel, Achterbahnen und dem großen Turm)
wird nach Sieg über `7-Burg` frei (Glasröhre `W8` auf der Welt-7-Karte, bisher „Welt 8 kommt bald!“). Sternbedarf zählt
**alle** Sterne (Welt 1–7: 206, dazu die Halloween-Welt). Es ist das **Finale**: Baron Brummbär hält die befreiten Freunde
der Reise (Krümel, Flocke, Hoppel und weitere kleine Tiere) in einem großen Glas auf der Turmspitze gefangen.

| Id | Archetyp | Thema | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `8-1` | parcours (regnerische Außenfestung: Stachelbrücken im Takt, Feuer-Werfer, Knochenflieger-Gruppen, die sich neu zusammensetzen) | rainfort | course_rainfort | 3 + Stempel | Welt 8 offen |
| `8-2` | ride (Wüsten-Abfahrt auf Pflaume: Schubfelder, Sandflosser, Pilzling-Sandskulpturen, Baron-Sandstatuen) | dunes | course_dunes | 3 + Stempel | 8-1 |
| `8-3` | parcours (Keks-Fabrik: drehende Kekse und Keks-Zahnräder, Riesenschnappblumen, Zahnradwand, Hörner-Ameisen-Straße) | cookie | course_cookie | 3 + Stempel | 8-2 |
| `8-Zug` | autoscroller + boss (Baron-Express: Hackvogel-Wagen, Wasserbecken, Mini-Pilzlinge, zweiter Kampf gegen die Schattenläuferin) | train | course_baronexpress | 3 + Stempel | 8-3 |
| `8-4` | parcours (Nacht-Festung: unsichtbare Stege leuchten nur um die Figur und bei Aufschlägen/Stampfen auf) | nightfort | course_footlight | 3 + Stempel | 8-Zug |
| `8-5` | parcours unterwasser (Unterwasser-Festung: Steigbecken, schwebende Wasserkörper, Stachelblöcke, kurzer Pflaume-Abschnitt) | dungeon | course_dungeon | 3 + Stempel | 8-4 |
| `8-Haus` | house (10 Räume à 10 s, alles nur mit Krallen-Anzug kletternd) | house | course_house | 10 | 8-4 |
| `8-6` | parcours (stockdunkles Spukhaus, Licht-Helm-Pflicht, Aufzugfahrten, großer Spiegel, Großspuk-Jagd) | darkghost | course_beamdark | 3 + Stempel | 8-5 |
| `8-7` | parcours (Lava-Inferno: Kristall-Felsklötze rollen los, wenn man draufsteht, Stampfen beschleunigt) | inferno | course_inferno | 3 + Stempel | 8-6 |
| `8-A` | parcours + boss (Anlauf, Seilbahn, Zirkusarena: **goldene Würfelblase**, Landungen mit Schockwellen) | circus | course_bossblob | 3 + Stempel | 8-7 |
| `8-B` | parcours + boss (wie 3-B: **rosa Schlangenkönig**, geschleuderte Lavabrocken hinterlassen Lavapfützen) | circus | course_boss | 3 + Stempel | 8-7 |
| `8-Burg` | parcours + boss, Finale (Rummelplatz um den großen Turm: Autowrack, Dächer mit Lavabrocken-Regen, Riesenrad mit 4 Schubsern, Turm hinauf; **Baron Brummbär im Krallen-Anzug** klettert, rutscht, reißt Wände ein, vervielfacht sich mit Spiegelfrüchten; Gipfel: Super-POW-Block 4× anstoßen, Glas der Freunde zerbricht, Abspann) | baronpark | course_finale | 3 + Stempel | 8-A **und** 8-B **und ≥ 190 Sterne** |

Welt 8 hat 43 Sterne. Neu: unsichtbare Leuchtstege (8-4), Kristall-Felsklötze (8-7), Steigbecken/schwebende Wasserkörper
(8-5), Keksräder und Keks-Zahnräder (8-3), Schubfelder in der Wüste (8-2), Riesenrad, Lavabrocken-Regen, Super-POW-Block,
Spiegel mit Spiegelbild-Stern (8-6); Gegner Sandflosser, Knochenflieger-Gruppe (setzt sich neu zusammen), Hackvogel
(vorhanden prüfen); Varianten goldene Würfelblase, rosa Schlangenkönig, Schattenläuferin 2; Endboss **Baron Brummbär im
Krallen-Anzug** (Feuerbälle, Wandklettern, Krallenhiebe, Spiegelfrucht-Doppelgänger, Super-POW auf der Turmspitze).
**Abspann:** nach dem Sieg eine eigene, liebevolle Abspann-Szene (befreite Freunde, Lotti und Greta, Pflaume, Krümel,
Musik `course_abspann`), danach zurück zur Karte; der Spielstand merkt sich „Spiel geschafft“.

## Präzisierung (Level 7-5, 7-Kapitän und 7-6)

Additiv zur Welt-7-Liste: Titel und Besonderheiten der Level 7-5, 7-Kapitän und 7-6. Dateien `src/course/levels/w7/7-5.js`,
`7-Kapitän.js`, `7-6.js`, eigene Hilfen `src/course/levels/w7/_helpers_c.js` (kein `LEVEL`, nur für diese drei Level; reicht
`isl`, `line`, `ring`, `arc`, `column`, `sign`, `glimmer`, `Bld` aus `w6/_helpers_b.js` und `onRespawn` aus `w7kit.js` weiter),
Test `tests/course_w7c.mjs`. **Kein Motor-Code geändert**; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.build`/`LEVEL.setup`). Bausteine nach „Präzisierung (Motor und Bausteine Welt 7)“, Gegner nach „Präzisierung (Gegner
Welt 7)“.

### 7-5 „Stampfsteinturm und Giftnebel-Flucht“ (parcours · lavatower · course_traptower · 400 s)

- Zwei Festungstürme im Lavaschacht, ≈ 165 m nach −Z, von y 0 bis y 40. **Erster Turm** (z 13 … −54): Stufenturm aus fünf
  Etagen (je 6 m höher, 10 m weiter hinten; gemauerte Seiten aus einzelnen Steinen, Plattenböden mit rotem Läufer, glühende
  Bogenfenster, Zinnen, Brummbär-Banner, Lavafälle). Die **Stampfsteine sind Fahrstühle**: locken, auf den gelandeten Stein
  springen, mit ihm eine Etage hinauffahren (Erdgeschoss → Etage 1; Etage 3 → Turmspitze). Dazwischen **Aufzug 1** (y 6 → 12,
  fährt los, sobald man daraufsteht, kehrt leer zurück), die **Fähre** über den Schacht in Etage 2, **Aufzug 2** (y 12 → 18)
  neben dem kletterbaren Pfeiler. Auf der Turmspitze drei **Zauberkröten**, links unten die **Sinkwolke**. → **Seilbahn**
  (z −54 … −88, Gondel `seilbahn` mit Stationsrahmen, y 26 → 22) → **Funkenturm** (z −88 … −126): Vorhof mit Checkpoint und
  Wurfsichel, Treppe auf Ring 1 (r 13, y 25), **Sprungfeder** auf Ring 2 (y 30), **Pfeilplattform aus der Wand** auf Ring 3
  (y 35), Stampfstein 3 auf die Turmkrone (y 40). Sechs **Funkenflämmchen** hüpfen auf Bögen über die Ringe, die Zinnen haben
  Lücken (Durchgänge wechseln die Seiten).
- **Flucht**: die fünfte Schlüsselmünze liegt auf der Krone – sobald man sie hat, sinkt der **Giftnebel** (`giftnebel`
  `dir: 'down'`, 0,9 m/s, Stimmung `flucht`) von oben, und der **Lavaspiegel** `glutsee` (`mode: 'signal'`, `rise` bis y 16,2)
  steigt (`nebelLava`). Rechts die Ringe hinunter, Treppe zur **Glutbrücke** (flutet nach ≈ 28 s), Warp-Terrasse (y 16,8, bleibt
  trocken). Die **Warp-Box** erscheint erst mit allen fünf Schlüsseln (`schluesselmuenze` Gruppe `tor`, `onAll` → `reveal`)
  und bringt zur Zinnenterrasse mit dem Zielmast. Neustart: Nebel und Lava zurück, Schlüssel bleiben.
- Sterne: 0 oben auf dem **Kletterpfeiler** bei Aufzug 2 (nur mit **Krallen-Anzug** aus dem ?-Block in Etage 2) · 1 alle
  **drei Zauberkröten** auf der Turmspitze besiegen (`task` → versteckter Stern) · 2 im **Ziegel-Würfel** vor Ring 1 (26
  Ziegel; Stampfattacke von oben, Springen allein reicht nicht). Stempel: von der Turmspitze links hinunter auf die
  **Sinkwolke**, sie fährt mit einem hinab (von Etage 3 aus zu hoch). Geheimnisse: Sinkwolke, Ziegel-Würfel, unsichtbarer
  Block mit Extraleben in Etage 1, Wachstumsbeere in Etage 2.
- Gegner: Stampfstein 3, Knochenflieger 3, Zauberkröte 3, Funkenflämmchen 6. Kameraschienen: Turm (Neigung 29°, Abstand 15,5),
  Seilbahn, Vorhof, Ringe (30°/16), Ziel. Rundstufen-Kollision `camIgnore` (die Kamera-Probe sieht Zylinder als Quader).

### 7-Kapitän „Krümel in der Zahnradschmiede“ (diorama · lavamachine · course_diorama · 400 s, 5 Sterne)

- Maschinen-Diorama 28 × 32 m mitten im Lavasee (`lavaspiegel` `mode: 'fest'`, y −1,2), Figur **Krümel** (springt nicht),
  Kamera Gier 18°, Neigung 46°. Ebenen: Boden y 0 (Startplatz mit blauem Läufer, Ziegel-Insel, Maschinenboden), Deck y 4,5,
  Dach y 9. Stahlplatten mit gelber Warnkante, Ziegel, Messing; gelb-schwarze Geländer an allen Lavakanten (Kollision, Krümel
  fällt nicht hinunter). **Förderband** (`foerderband`, rollt nach vorn, 1,6 m/s) über den Lavasee; **Stampfsteine als
  Trittstufen**: gelockt fallen sie bündig in ihre Lavagrube – Brücke oder Fahrstuhl. **Kanonentürme** mit Projektilköpfen
  (quer übers Band und über das Deck, 4,5 s Takt). **Fahrplattform** (Aufzug, y 4 → 8,5) aufs Kesselturm-Dach.
- Sterne (Bauplan): 1 **hinter dem sichtbaren Stampfstein** (Insel jenseits des Lavagrabens; der Stein liegt als Brücke) ·
  2 **Fahrplattform** hinauf, ins **Loch** im Kesselturm-Dach fallen (die Kammertür ist für Krümel eine zu hohe Stufe) · 3
  **auf dem Förderband** (gegen das Band laufen; wer stehen bleibt, wird zurückgetragen) · 4 **auf Stampfstein 2** nach dem
  Band (locken, draufgehen, mitfahren) · 5 durch das **Loch** im Maschinenblock, **Stampfstein 3** hinauf aufs Dach, in den
  **Schacht** fallen. Der fünfte Stern beendet das Level. Schatzstellen (`dig`): Startplatz, Deck, Kesselturm-Dach.
- Zier: Zahnräder, Rohre, Schlote, Kessel mit Manometer und Dampf, Ventilräder, Warnstreifen-Pfosten, Brummbär-Banner und
  Dachfahne, Standfackeln, zwei Lavafälle aus Rohrstutzen, Glutfunken. Gegner: Stampfstein 3, Kanonenturm 2.

### 7-6 „Rammfisch-Riff am Feuerberg“ (parcours · reef · course_rammreef · 400 s)

- ≈ 250 m nach −Z, Meeresspiegel y 0. **Riff** (z 14 … −92, Becken bis y −8): Startstrand (Palmen, Sonnenschirm, Liegestuhl,
  Muscheln) → Kammer A (Nische hinter Kisten) → Riffwand 1 (Kistentunnel oder Rammfisch-Lücke) → Kammer B → Riffwand 2
  (Kistentunnel) → Kammer C (Zickzack-Gänge) → Sandrampe zur Felsplattform mit **Warp-Box** → **Vulkaninsel** (z −95 … −160,
  y 1,2: Checkpoint, Gezeitenbecken mit drei **Wutkaulquappen**, Trittsteine über das zweite Becken, Feuerberg mit Glutkrater,
  Glutrisse, Palmen, Moos- und Sandflecken, Farne, Hibiskus) → Klippe hinab ins **Finale** (Becken bis y −9: Riffwand mit
  drei Fenstern, in denen **Rammfische auf und ab** ziehen; zwei **große Rammfische** kreisen vor dem Zielriff) → Sandrampe
  aufs **Zielriff** (Palmenstrand, Glasröhre, Zielmast).
- **Zerbrechliche Kisten** (`kiste_wasser`, 7 Stück) brechen beim Schwimmstoß (und wenn ein Rammfisch hineinrammt); langsames
  Schwimmen lässt sie heil. Kamera unter Wasser flach (Neigung 10°, Abstand 9, Höhe 0,7) und immer unter der Oberfläche,
  klare Sicht (`setup`: Nebel 7 … 58 m, zarte Lichtflecken).
- Sterne: 0 in der **Nische hinter Kisten** gleich am Start · 1 trägt der **Rammfisch in einer Blase** (`carries: 'star:1'`,
  rammt nicht; von oben anschwimmen) · 2 hinten in der **Glasröhre** auf dem Zielriff hinter den großen Rammfischen; die
  lila **Stachelkugel** darin verbrennt nur die **Funkenblüte** aus dem ?-Block davor (`onHit` 'fire' → wie 'bomb'). Stempel:
  oben auf dem **Felsturm** hinter der Fensterwand (durchs Fenster, wenn der Rammfisch unten ist). Extraleben: Kiste am Rand
  von Kammer B, unsichtbarer Block auf der Vulkaninsel.
- Gegner: Rammfisch 10 (2 groß, 3 auf und ab, 1 mit Stern), Wutkaulquappe 3.
- Leistung: `fernSicht` (statische Abschnitte bis 62 m), `tiefSicht` (unter Wasser zeichnet die Kamera nur bis 64 m – der
  Nebel verdeckt ohnehin alles; ≈ 40 Zeichenaufrufe weniger), `fernModelle` (Schilder, Becken, Warp-Boxen, Sterne, Zielmast
  über 85 m per `layers` aus), Rammfische ohne Sonnenschatten und erst ab 48 m Nähe sichtbar.

### Hilfen `_helpers_c.js`

Geometrie: `Quads`, `STONE` (Paletten burg, rot, dunkel, basalt, sand, stahl, messing, ziegel), `brickFace`, `tiles`,
`brickBox` (Mauerquader mit Kollision, Steinen, Platten, Läufer, Fenstern; `climbable`, `camIgnore`), `carpet`, `slits`,
`merlons`, `merlonsRound`, `gelaender`, `flushQ` (Hauptgeometrie mit Schatten, Detail-Vierecke ohne), `roundTier` · Belebtes:
`ketten`, `funken` · Leistung: `fernSicht`, `fernModelle`, `tiefSicht` · Mechanik: `aufzug` (Mover/Wolke fährt los, wenn eine
Figur daraufsteht, wartet oben, fährt leer zurück; Neustart setzt zurück; `name` → `level.named`), `nebelLava`.

### Test `tests/course_w7c.mjs`

Port 4730 (+ `PORT_BASE`), Aufruf `node tests/course_w7c.mjs [7-5|7-Kapitän|7-6]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,shots` (je Lauf < 10 min; je Level `load,route,sweep` und `load,targets,extra` und
`shots` getrennt), `HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`, `TRACE=1`, `SHOTS=<Name|…>`, `DETAIL=1`, Bilder
`tests/out/w7c_*.png`. Bot mit echter Eingabe (`setInput`/`step`, Stick relativ zur Kamera-Gier), auf der Route unverwundbar
(Treffer-Versuche werden gezählt; Nebel, Lava und Absturz töten trotzdem); Beine u. a. `wait`/`until` (Bedingungen wie
Stampfstein gelandet, Aufzug oben, Gondel angekommen, Pfeilplattform draußen, Band frei), `climbOnto`, `poundAt`, `toads`,
`chaseKind`, `swim`/`swimTo` (Schwimmstöße, `noStroke`), `clearFish`, `fire` (Funkenblüte), `warp`. Diorama: ein Lauf mit Krümel.
Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta Start → Ziel **ohne einen
Treffer-Versuch** (7-5 ≈ 85/78 s mit drei Stampfstein-Fahrten, zwei Aufzügen, Fähre, Seilbahn, Sprungfeder, Pfeilplattform,
fünf Schlüsseln und der Flucht in ≈ 10 s; 7-Kapitän ≈ 63 s, alle fünf Sterne; 7-6 ≈ 71/69 s mit Kistentunnel, Warp und
Finale); alle Sterne und Stempel mit Gegenproben (Pfeiler ohne Krallen-Anzug, Ziegel ohne Stampfen, Stempel von Etage 3,
Graben ohne Stein, Stein 2 vom Boden, Kammertür, Schachttür, Kisten bei langsamem Schwimmen, Röhre ohne Funkenblüte); Extras
(Extraleben, versteckte Warp-Box, Nebel-Tod auf der Krone, Lava flutet die Glutbrücke, Neustart nach Nebel-Tod, Krümel springt
nicht, Projektilkopf und Stampfstein treffen, Band trägt zurück, Rammfisch und Wutkaulquappe treffen, Checkpoint auf der
Insel). Gemessen (scale 2, inkl. Schattenpass; Messgang entlang der Route und Bilder je Abschnitt): 7-5 52–111 Zeichenaufrufe
in den Bildern, Messgang ≤ 115 (beim Hinauffahren auf Stampfstein 2) / ≤ 243 k Dreiecke · 7-Kapitän ≤ 104 / ≤ 154 k · 7-6
45–89 / ≤ 186 k.

## Präzisierung (Level 7-C, 7-7 und 7-Burg)

Additiv zur Welt-7-Liste: Titel und Besonderheiten der Level 7-C, 7-7 und 7-Burg. Dateien `src/course/levels/w7/7-C.js`,
`7-7.js`, `7-Burg.js`, eigene Hilfen `src/course/levels/w7/_helpers_d.js` (kein `LEVEL`, nur für diese drei Level; nutzt
`Bld`, `litTop`, `gradY`, `glowField`, `onRespawn` aus `w5/_helpers_b.js`, `ziegel`, `werferKram`, `wappenMosaik` aus
`_helpers_a.js` (nur gelesen), `fireMaterial` aus `blocks/w7kit.js`; 7-7 zusätzlich `steamVents` aus `w4/_helpers_c.js`),
Test `tests/course_w7d.mjs`. **Kein Motor-Code geändert**; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.build`/`LEVEL.setup`). Bausteine nach „Präzisierung (Motor und Bausteine Welt 7)“, Gegner nach „Präzisierung (Gegner
Welt 7)“.

### 7-C „Siebenfeuer-Saal der Werfer-Bande“ (arena · fortress · course_arena · 100 s, 1 Stern)

- Versteck der Werfer-Bande: Halle 20 × 20 m aus dunkelrotem Backstein hoch über dem Lavasee (Saalboden y 2). Vorn der
  gekachelte Saal mit dem **Siebenfeuer-Mosaik** (sieben goldene Flammen im Kreis), zwei Gitterroste (`gitterboden`) über
  glühender Lava in den vorderen Ecken, niedrige Zinnen-Brüstung vorn (unsichtbare Wand, Kamera sieht darüber). Hinten die
  **Empore** (+2 m, Treppe mit rotem Läufer), darauf die hölzerne **Kanzel** des Anführers (+2,4 m, Einweg); links und rechts
  je ein **Holzbalkon** (Einweg, +2,4 m). An der Rückwand der Empore **sieben Feuerschalen** – je Werfer eine; besiegt erlischt
  seine Schale (`siebenFeuer`, benannt `siebenfeuer` mit `lit`/`out`).
- 7 Feuer-Werfer (zwei im Saal, zwei zwischen Saal und Balkon, zwei auf der Empore, der Anführer zwischen Empore und Kanzel).
  Arena-Zählung und Neustart nach Tod über den Archetyp (`LEVEL.arena.enemies: 'all'`, Stern auf dem Mosaik). Draufspringen in
  der Wurfpause besiegt, ebenso die Wurfsichel (?-Block vorn links). Münzblock vorn rechts, unsichtbarer Block mit Extraleben
  über der rechten Emporen-Ecke. `instances.feuer_werfer.shadowDist: 8` (Zeichenaufruf-Budget).

### 7-7 „Ebbe und Glut im Brodelkrater“ (parcours · volcano · course_volcano · 400 s)

- Vulkankrater ≈ 265 m nach −Z (Inseln y 2). Abschnitte: **Start** (Basaltplateau, ?-Block mit Wurfsichel, Pegelmesser) →
  **Lavasee** (`lavaspiegel` im Zyklus 12,5 s: Ebbe 0,2 m, Vorwarnung, Flut 1,6 m; hohe Inseln 2 m und Hochsteine 1,85 m
  bleiben trocken, **Bimsstein-Trittsteine 1 m nur bei Ebbe**; Bimsstein-Enten schaukeln auf dem Spiegel; Platschfische –
  zwei endlos nachkommend –, Knochenflieger, Steinbogen von Insel 3 zu Insel 4) → **Glasröhre** hoch über die Lava zum
  Kontrollpunkt → **Fontänenfeld** (Gitterrost über der Stempel-Grube mit eigenem Lavaspiegel, großer Gitterboden mit heißen
  Fontänen, zwei tragende Fontänen mit Krustenplatten hinauf zur Basaltterrasse, Steg zur **großen blauen Quadratplattform**
  (6 × 6 m, `mover` mit blauer Haut `blauePlatte`), die quer über das Lavabecken zum Anleger fährt) → **Drachenbucht**
  (Zickzack-Weg, acht Lavadrachen, Vulkanfelsen als Deckung, Zaun aus Basaltsäulen) → **Ziel** (Forscherzelt mit Thermometer).
- Sterne: 0 **hoch über der Lava neben Insel 1** – nur mit der Wurfsichel im Sprung vom Wurf-Podest erreichbar · 1
  **Sternenring** auf Insel 4: acht Sternmünzen in 14 s, drei davon über Bimssteinen (nur bei Ebbe) · 2 **von der blauen
  Plattform nach Süden** auf einen Basaltsockel springen. Stempel: **unter dem Gitter nach dem Kontrollpunkt** – nur bei Ebbe
  der Grube (durch das Loch neben dem Gitter hinab; bei Flut füllt sich die Grube).
- Extraleben: unsichtbarer Block auf Insel 3, 1-Up auf der Säule neben der östlichen Krustenplatte (`speed: 0`, läuft nicht
  weg). Wachstumsbeere am Kontrollpunkt, Wurfsichel auf der Terrasse. Gegner: Knochenflieger 7, Platschfisch 7, Lavadrache 8
  (`instances`: Schattenweite 12–14 m, Platschfische/Lavadrachen mit `farHide`).
- Kulisse (`krater77` u. a.): Kraterwände mit Lavafällen, sechseckiges Basaltpflaster mit glühenden Fugen, Glutlilien,
  Schwefelschlote mit Dampf, Drachennester, Pegelmesser.

### 7-Burg „Kampfwagen-Duell in der Glutfeste“ (boss · lavacastle · course_keep · 500 s)

- Lava-Burg ≈ 165 m + Boss-Straße ≈ 150 m nach −Z (Höfe y 2 über Lava y 0). Abschnitte: **Vorplatz** (links zwei Mauerpfeiler
  über der Lava: Wandsprung-Schacht) → **Vorhof** (Lavablasen-Bögen, Bumerang-Werfer – einer trägt eine goldene Wurfsichel und
  lässt sie besiegt fallen –, Trittsteine, zweiter Hof zwischen Lavabecken) → **Zugbrücke** (Wachturm mit grauer Blockwand
  `megawall`; die `bomb_cannon` auf dem Torhaus schießt Kickbomben vor den Turm; eine gekickte Bombe sprengt die Wand und legt
  den `druckknopf` frei, er schaltet die `zugbruecke` um – nochmal drücken hebt sie wieder; ist die Wand weg, schweigt die
  Kanone. Im Graben ein Eisengitter vor der hochgezogenen Brücke) → **Wachhof** (Kontrollpunkt, Feuer-Werfer auf der
  Brüstung, Gitter-Vordach über der Lava) → **Klappstampfer-Gang** über der Lava → **Steg** zur **Hammer-Bühne** (zwei
  Hammer-Werfer besiegen → `task` zeigt die Warp-Box zum Boss) → **Boss-Straße** (`kampfwagen_strasse` mit Lavalücken,
  Mittellücke und Stachelfallen; **Baron Brummbär im Kampfwagen** `baron_kampfwagen`, 9 Treffer aus zurückgekickten Kickbomben
  oder je zwei Wurfsichel-Kratzern; Kontrollpunkt am Startplatz, Tod setzt den Baron zurück) → Warp-Box nach dem Sieg zum
  **Siegerplateau** mit Krümel im Käfig (`rescue_friend`) und Zielmast. `LEVEL.boss` mit `trigger` vor dem Startplatz,
  `warpBanner` „Ab in die Warp-Box!“.
- Sterne: 0 **nahe dem Start per Wandsprung** zwischen den Mauerpfeilern über der Lava (oben auf dem inneren Pfeiler; vom
  Vorplatz mit dem Dreifachsprung nicht erreichbar) · 1 **oben auf der hochgezogenen Zugbrücke** (Wandsprung zwischen
  Grabengitter und Brücke) · 2 **nach dem Kontrollpunkt unter dem Gitter-Vordach über der Lava** – nur mit der Wurfsichel aus
  dem ?-Block am Kontrollpunkt (Springen stößt an das Gitter). Stempel: im **Wachturm per Wandsprung über dem Druckknopf**
  (erst nach der Kickbombe offen).
- Extraleben: unsichtbarer Block auf der Hammer-Bühne. Gegner: Bumerang-Werfer 3, Feuer-Werfer 2, Hammer-Werfer 2,
  Lavablase 12, Klappstampfer 3, Baron im Kampfwagen.
- Kulisse: Ziegelfassaden mit Lavasaum, Zinnenmauern, Torhaus mit Fallgitter, Eisengitter (Kamera sieht hindurch:
  `camIgnore`), Banner, Brummbär-Statuen, Lava-Brunnen, Wappen-Mosaike, roter Läufer, Lager der Bande, Wimpel am Ziel.

### Hilfen `_helpers_d.js`

Daten: `isl`, `line`, `ring`, `arc`, `column`, `sign` · gemeinsam: `kacheln`, `bogenFenster`, `flammeGeo` · 7-C: `SAAL`,
`siebenfeuerMosaik`, `saal7C`, `siebenFeuer` · 7-7: `KRATER`, `krater77`, `basaltPflaster`, `glutlilien`, `schwefel`,
`drachenNest`, `forscherZelt`, `blauePlatte`, `bimsEnten`, `pegel` · 7-Burg: `FESTE`, `burgMauer`, `burgFassaden`,
`eisenGitter`, `burgBanner`, `baerStatue`, `lavaBrunnen`.

### Test `tests/course_w7d.mjs`

Port 4750 (+ `PORT_BASE`), Aufruf `node tests/course_w7d.mjs [7-C|7-7|7-Burg]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,arena,boss,shots` (je Lauf < 10 min: `load,route,sweep` und `targets,extra` getrennt,
7-Burg `boss` einzeln), `HEROES=lotti,greta`, `ONLY=<Text>`, `VERBOSE=1`, `TRACE=1`, `SHOTS=<Name|…>`, `DETAIL=1`, Bilder
`tests/out/w7d_*.png`. Bot mit echter Eingabe (`setInput`/`step`, Stick relativ zur Kamera-Gier), auf der Route
unverwundbar; Bedingungen nach Lavapegel (`until: 'seeEbbe'` …), Beine u. a. `walls` (Wandrutschen und Wandsprung im
Schacht), `sichelAt` (Wurfsichel im Sprung), `bombe` (Kickbombe gegen die Wand), `carry` (Krustenplatte), `ride` mit
`jumpAt`, `pipe`, `warp`, `chaseKind` (mit `near`), `boss` (Kampfwagen-Duell).
Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegner- und Bausteinzahlen; Routen-Bot Lotti und Greta Start → Ziel (7-7
≈ 91/90 s mit Ebbe-Warten, Glasröhre, Krustenplatte und blauer Plattform; 7-Burg ≈ 109/105 s mit Kickbombe, Druckknopf,
Zugbrücke, Klappstampfern, Warp-Box und Baron-Kampf); 7-C-Kampf ≈ 23/24 s (die Schalen erlöschen der Reihe nach, Tod setzt die
Arena zurück, Wurfsichel trifft Werfer aus 2,5–7 m, Zeitlimit 100 s); 7-Burg-Boss nur mit zurückgekickten Kickbomben (9/9,
≈ 111 s, über alle drei Lavalücken), Abprall auf dem Kampfwagen ohne Schaden, Tod setzt den Baron zurück; alle Sterne und
Stempel mit Gegenproben (Stern 0 der Burg nicht per Dreifachsprung, Vordach-Stern nicht ohne Sichel, Turmschacht hinter der
Blockwand verschlossen, Bimssteine bei Flut tödlich, Hochsteine bleiben trocken, Zugbrücke ohne Knopf oben, Knopf hebt sie
wieder); Extraleben aller drei Level. Gemessen (scale 2, inkl. Schattenpass, Messgang alle ~7 m der Route und Bilder je
Abschnitt): 7-C 74–106 Zeichenaufrufe / ≤ 254 k Dreiecke · 7-7 43–93 / ≤ 183 k · 7-Burg 43–84 / ≤ 187 k.

## Präzisierung (Modelle Welt 8) (Hauptsitzung)

Kurzübersicht der Welt-8-Modelle; die exakten `opts`/`state` stehen in den Kopfkommentaren der Dateien
`src/course/models/kinds/bosses_w8.js`, `enemies_w8.js`, `gimmicks_w8.js`, `props_rummel_w8.js`, `props_festung_w8.js`,
`szene_w8.js` sowie `src/course/models/lib/instanced_w8.js` und `w8Geos.js`. Test `tests/course_models_w8.mjs`.

- **Bosse:** `baron_krallen` (≈ 3,4 m, `opts.clone` = leuchtender Spiegelfrucht-Doppelgänger; `state.anim`
  `idle|walk|climb|slide|swipe|fire|hit|stunned|fall|clone|defeated`, `hp`, `maxHp` 4; `swipe` 0,7 s mit Treffern bei
  0,42/0,62, `fire` 0,8 s mit Kugel bei 0,45; `model.hand(out, 'rechts'|'links')`, `model.mouth(out)`, `userData.radius`
  0,75 / `top` 3,2 / `wallX` 0,8), `super_pow_block` („Super-Wumm-Block“, `opts.size` 5, `state.hits` 0..4, `squash`,
  `anim 'idle'|'hit'`; `model.topAt(hits)` = size·(1 − 0,16·hits)), `freunde_glas` (2,4 m, `opts.friends`
  `['kruemel','flocke','hoppel','kobold']`, `state.anim 'idle'|'shake'|'cheer'`, `shake`, `break` 0..1, `cheer`;
  `model.friend(i, out)`).
- **Varianten:** `wuerfelblase { color: 'gold' }` (vorhanden), `schlangenkoenig { color: 'rosa' }` (neu, additiv in
  `bosses_w3.js`, Standard unverändert), `schattenlaeuferin` unverändert (mit `clone`).
- **Gegner:** `sandflosser` (Ursprung Sandoberfläche, `anim 'swim'|'jump'|'defeated'`), `knochenflieger_gruppe`
  (`opts.count` 2..8, `radius`, `formation 'ring'|'reihe'|'keil'`; `anim 'fly'|'dive'|'scatter'|'assemble'`, `alive[]`;
  `model.member(i)`), `kristall_felsklotz` (`opts.size` 3, `shape 'kugel'|'wuerfel'`; `anim 'idle'|'roll'|'fast'`, `roll`
  rad nach +X; `userData.top`/`radius`), `baron_sandstatue` (≈ 4,1 m, `state.break` 0..1).
- **Gimmicks:** `leuchtsteg` (`opts.size [x,z]`, `thick`; `state.glow`/`flash`, bei glow 0 unsichtbar), `keksrad`
  (`size`, `thick`, `axis 'y'|'x'|'z'`, `color 'hell'|'schoko'`; `angle|speed`), `keks_zahnrad` (`radius`, `teeth`,
  `thick`, `axis`), `riesenrad` (Ursprung Nabe, Ebene XY, `radius` 8, `count` 8, `plank`, `depth`; `model.platform(i)`,
  Plattform i bei (R·cos a, R·sin a − 1,2, 0), a = angle + i·2π/n), `wasserkoerper` (`size [x,y,z]`, `wobble`),
  `steigbecken` (Ursprung Innenboden, `size [x,z]`, `height`, `wall`; `state.level` 0..1, `userData.water`),
  `stachelblock_blau`/`_rot` (`size`, `faces 'alle'|'seiten'|'oben'|'vorn'`; `out`, `warn`), `schubfeld` (`size`, Lauflicht
  nach +X; `on`, `speed`), `lavabrocken_regen` (`size`; `anim 'fall'|'land'|'glow'`, Warnfeld = vorhandene `landemarke`),
  `lavapfuetze` (`size`; `anim 'idle'|'grow'|'cool'`), `schockwelle` (`radius`, `color 'gold'|'weiss'`; `progress`).
- **Kulisse (ohne Spielzeug-Look, backbar):** `baron_turm` (`part 'ganz'` ≈ 40 m | `'spitze'` Gipfel Ø 26 m, Ursprung
  Plattform-Oberseite), `karussell`, `riesenrad_kulisse`, `achterbahn` (`kind 'gerade'|'kurve'|'looping'|'wagen'`),
  `rummel_bude` (`color`, `seed`), `wimpelkette`/`gluehbirnenkette` (Ursprung linker Aufhängepunkt, `length`, `sag`),
  `brummbaer_ballon` (`color`, `count` 1..3), `regenfestung` (`kind 'mauer'|'turm'|'pfuetze'|'fahne'`), `keksfabrik`
  (`kind 'band'|'keksturm'|'zuckerguss'`), `wasserfestung` (`kind 'algen'|'gitter'|'saeule'`), `spukspiegel`
  (`state.star`, `glow`), `duene`, `autowrack` (Welt-1-Auto verbeult, `state.smoke`).
- **Abspann:** `abspann_buehne` (Wiese Ø 12 m, Picknick, Torte, Lampions, vier Freunde; `state.wave`, `glow`;
  `userData.spots` für lotti, greta, pflaume, kruemel_kapitaen).
- **Instanz-Varianten** (`instanced_w8.js`): `leuchtsteg`, `knochenflieger` (`'fly'|'dive'|{ anim: 'bones'|'assemble',
  progress }`), `brummbaer_ballon`.

## Präzisierung (Motor und Bausteine Welt 8)

Ergänzung des Motor-/Bausteine-Agenten für Welt 8 „Brummbär-Rummelplatz“ (Stand: Rummelwerkstatt `0-31`). Nichts oben
Festgelegtes wird geändert; alles ist additiv. Alle Welt-8-Mechaniken sind parametrierbare Module, Level-Bauer setzen sie nur
in Daten ein; jede Datei dokumentiert ihre Felder vollständig im Kopfkommentar. Aktionen im bekannten Format (Signal-Verben
`reveal`/`hide`/`start`/`stop`/`toggle`/`open` rufen die gleichnamigen Methoden der benannten Handles), neu ist die Aktion
`{ credits: true | 'sofort' }` (Abspann). Alle Welt-8-Bausteine sind auch als `kind` (Hülle wie Welt 7) erlaubt bzw. per
`level.spawn(kind, spec)` zur Laufzeit erzeugbar. Richtungen im 90°-Raster; `yaw: −π/2` = Vorderseite zur Kamera (+Z);
Level verlaufen nach −Z. Alle Takte laufen auf der Level-Uhr (`level.time`) – deterministisch, Reihen über `phase` versetzen.
Jeder Baustein nutzt sein Registry-Modell (Welt-8-Modelle, `models/kinds/*_w8.js`, Übersicht „Präzisierung (Modelle Welt 8)“),
sonst eigene Ersatz-Geometrie mit gleicher Kollision und Mechanik; `look: 'eigen'` erzwingt die eigene Geometrie. Wo das
Modell Maße vorgibt (Riesenrad-Planken 1,2 m unter dem Aufhängepunkt, Zahnform, Super-POW wird je Stoß niedriger,
Spukspiegel-Glas), folgt die Kollision dem Modell; die Tabelle „Modelle“ unten nennt die Abbildung.

### Präzisierung (Motor und Bausteine Welt 8): Dateien

```
src/course/blocks/w8kit.js                 w8(level) Sammelstelle { stegs, rocks, pools, cubes, spikes, cookies, gears, fields,
                                           wheels, rains, mirrors, pows, bridges, flashes, impacts }, flash/flashAt (Aufleuchten),
                                           watchImpacts (Aufschläge erkennen), pathOf/pathAt (Pfade), regModel, stdMat, spikeGeo,
                                           canvasTexture, bakeW8 (Modell backen, mit Instanzfarben); dazu die Hilfen aus w7kit
                                           (figures, hurtFigures, cycle, onRespawn …)
src/course/blocks/types/w8_leuchtsteg.js   leuchtsteg (Instanz-Kacheln je Level bzw. eigenes Shader-Mesh; 1 Zeichenaufruf)
src/course/blocks/types/w8_felsklotz.js    kristall_felsklotz (Kugel und Würfel)
src/course/blocks/types/w8_wasser.js       steigbecken, wasserkoerper
src/course/blocks/types/w8_stachel.js      stachelblock (blau/rot), stachelwand
src/course/blocks/types/w8_keks.js         keksrad, keks_zahnrad
src/course/blocks/types/w8_schubfeld.js    schubfeld
src/course/blocks/types/w8_riesenrad.js    riesenrad
src/course/blocks/types/w8_lavaregen.js    lavabrocken_regen
src/course/blocks/types/w8_spiegel.js      grosser_spiegel (MIRROR_LAYER 5)
src/course/blocks/types/w8_pow.js          super_pow_block
src/course/blocks/types/w8_fallblock.js    fallblock_bruecke
src/course/blocks/types/deco_w8.js         Kulisse Welt 8 und Abspann (verschmolzen; Welt-8-Kulissenmodelle gebacken bzw. bewegt)
src/course/entities/kinds/w8_gimmicks.js   Hüllen (alle Welt-8-Bausteine als kind), abspann_ausloeser
src/course/credits.js                      Abspann-Ablauf ohne schwere Abhängigkeiten: CREDITS_KEY, requestCredits,
                                           creditsWanted, startCreditsFrom
src/course/CreditsScene.js                 Phaser-Szene 'Credits' (Abspann mit eigener 3D-Bühne)
src/course/view/theme_rainfort|dunes|cookie|nightfort|dungeon|darkghost|inferno|baronpark|abspann.js, backdrop_w8.js
src/course/levels/w0/0-31.js               Rummelwerkstatt (Stationen S0–S14 mit Schildern, marks für den Test)
tests/course_w8_blocks.mjs                 Port 4760, W8B_PART=mech|themes|credits, Bilder tests/out/w8b_*.png
```

Additiv geändert (je wenige Zeilen, mit Kommentar): `src/main.js` (Szene `CreditsScene` registriert, `?credits=1` →
Registry `startCredits`), `course/CourseBoot.js` (startet bei `startCredits` den Abspann), `course/CourseScene.js`
(`exitToMap({ done })` führt in den Abspann, wenn `creditsWanted(scene)`), `course/entities/gimmick.js` (`runAction`: Aktion
`credits`), `course/view/themes.js` (9 Registrierzeilen `??=`), `course/map/MapHud.js` (Pokal am Weltschild bei
`courseSave.data.finished`, Meldung nach dem Abspann). Motor (Player, Level, Kollision) unverändert.

### Präzisierung (Motor und Bausteine Welt 8): Liste mit Daten-Beispielen

| Typ / Art | Kern | Wichtige Felder (Standard) | Beispiel |
| --- | --- | --- | --- |
| `leuchtsteg` | unsichtbarer, immer begehbarer Steg; sichtbar nur im Umkreis jeder Figur (mit Modell Kachel für Kachel, eigene Geometrie je Pixel mit weichem Rand und Lichtsaum) und großflächig für ≈ 2 s um jeden Aufschlag (Stampfstein landet, Suchkopf/Projektilkopf zerplatzt, Stampfattacke der Figur, Lavabrocken, Felsklotz-Absturz, Super-POW, Signal `aufschlag`); leuchtet selbst, wirft keinen Schatten | `pos` (Mitte Unterseite), `size` [2, 0.4, 6] \| `parts` [{ `pos`, `size` }] \| `from`, `to`, `n` 4 (Reihe/Treppe, size je Platte [1.6, 0.3, 1.4]), `radius` 3.2, `soft` 1.1, `flash` true, `color` 'gold' \| 'tuerkis' \| 'rosa' \| 'weiss', `hint` 0 (Grundschimmer), `always` false, `oneWay` false, `hidden` false → `{ parts [{ box, shape }], lit (Anteil sichtbarer Platten), visibleAt(x, y, z) → 0..1, flash(x, y, z, r), reveal(), hide(), info() }`; Form-Tag `leuchtsteg` | `{ type: 'leuchtsteg', id: 'steg1', pos: [0, -0.4, -18], size: [2.4, 0.4, 12] }`; Treppe: `{ type: 'leuchtsteg', from: [-7, 0.3, -26], to: [-10, 2.1, -32], n: 4, color: 'rosa' }` |
| `kristall_felsklotz` | Fahrzeug über Lava: ruht (schaukelt), bis jemand draufsteht, wartet `wait` s und fährt den Pfad ab; Stampfattacke gibt Schub; senkrechte Pfad-Abschnitte (waagerecht < ⅓ der Höhe) = Abstürze (freier Fall, Aufprall rumpelt, Figur fällt mit); Hang bergab schneller; Ende: halt/sinken/zurück; Checkpoint-Neustart → zurück | `pos` (Mitte Unterseite am Start), `size` 3 (Ø bzw. Kante; Kollision Kugel [0,62·size, size, 0,62·size], Würfel size³; auch [w, h, d] für die eigene Geometrie), `path` [[x, y, z] …] (ab pos), `speed` 2.4, `accel` 1.4, `boost` 2.5, `maxSpeed` 7, `boostDecay` 0.9, `wait` 0.35, `slope` 1.6, `start` 'stand' \| 'signal' \| 'auto', `end` 'halt' \| 'sinken' \| 'zurueck', `sinkDelay` 1.2, `respawn` 3, `variant` 'kugel' (Standard; 'platte' = kugel) \| 'wuerfel', `color` 'lila' \| 'blau' \| 'gruen' (eigene Geometrie), `bob` 0.06 → `{ state ('ruhe'\|'wartet'\|'faehrt'\|'faellt'\|'ende'\|'sinkt'\|'weg'\|'zurueck'), s, speed, boosts, falls, mb, carries(f), start(), stop(), reset(), boostNow(), info() }`; MovingBox-Tag `felsklotz` | `{ type: 'kristall_felsklotz', id: 'klotz1', pos: [0, -2.55, -44.4], size: 2.6, path: [[0, -2.55, -50], [5, -2.55, -55]], end: 'sinken' }`; Würfel: `{ …, variant: 'wuerfel', size: 2.6, path: [[0, -2.55, -78.2], [0, -5.55, -78.4], [0, -5.55, -85.2]] }` |
| `steigbecken` | Becken, dessen Spiegel im Takt steigt/sinkt (unten → Vorwarnung: blubbert, Pegel zittert → steigt → oben → sinkt); Figuren steigen mit (Motor `setWaterLevel`), stehende beginnen zu schwimmen; Pegelstriche (gelb hoch, blau tief) | `pos` (Mitte Beckenboden), `size` [w, h, d] (h = größte Tiefe), `low` 0.25, `high` h, `wait` 2.5, `warn` 0.8, `rise` 1.8, `hold` 2.5, `fall` 1.8, `phase`, `mode` 'takt' \| 'signal' (start füllt, stop leert), `current`, `walls` false (true: Steinrand 0,5 m, Höhe h + 0,3 – mit Modell `steigbecken`), `style` 'stein' \| 'festung' → `{ top, k, state ('unten'\|'warn'\|'steigt'\|'oben'\|'sinkt'), waterId (`${id}#w`), start(), stop(), info() }` | `{ type: 'steigbecken', id: 'becken', pos: [0, -4, -122], size: [14, 4.6, 16], walls: true, low: 0.3, hold: 2.5 }` |
| `wasserkoerper` | schwebender Wasserwürfel: hinein = schwimmen, oben herausspringen, unten/seitlich hinaus = fallen; wabernde, durchscheinende Wände (Modell wabbelt beim Hinein-/Herausspringen) | `pos` (Mitte Unterseite), `size` [4, 4, 4] \| `parts` [{ `pos`, `size` }], `current`, `color` (sonst Thema), `wobble` 0.08 → `{ parts, inside(f), info() }`; Wasserform-Tag `wasserkoerper` | `{ type: 'wasserkoerper', id: 'wuerfel1', pos: [0, 0.3, -138.5], size: [4, 4, 4] }` |
| `stachelblock` | Block mit Stacheln auf gewählten Seiten fährt seinen Pfad; Stacheln verletzen (Rückstoß weg von der Fläche), stachellose Seiten sind Wände/begehbar (trägt mit); eingeklemmt → herausgeschoben (`damage: 'tod'` = zerquetscht). blau: Takt mit Halt + Vorwarnung (zittert, Stacheln blinken); rot: wandert ohne Pause, glüht | `pos`, `size` [2, 2, 2], `color` 'blau' \| 'rot', `spikes` 'alle' \| ['+x', '-x', '+z', '-z', 'oben', 'unten'] (auch 'rechts'/'links'/'vorn'/'hinten'), `spikeLen` 0.45, `path` \| `move` [dx, dy, dz], `speed` blau 3 / rot 2.2, `wait` blau 1.2 / rot 0, `warn` 0.5, `mode` 'pingpong' \| 'loop' (rot ab 3 Punkten), `phase`, `idle`, `damage` 'treffer' \| 'tod' → `{ state ('wartet'\|'warn'\|'faehrt'\|'steht'), mb, spikes, hits, crushes, start(), stop(), info() }` | `{ type: 'stachelblock', id: 'blau1', pos: [-4, 0, -158], color: 'blau', move: [8, 0, 0] }` |
| `stachelwand` | wandernde Stachelwand (wie stachelblock) | Standard `size` [10, 4, 1], `spikes` ['+z'], `move` [0, 0, 6], `speed` 2, `wait` 1.5, `color` 'blau' | `{ type: 'stachelwand', id: 'wand1', pos: [0, 0, -183], size: [14, 3, 1], move: [0, 0, 5] }` |
| `keksrad` | drehender Riesenkeks: waagerecht (`axis: 'y'`) wie ein Drehteller (cyl mit mover.dyaw), senkrecht (`'x'`/`'z'`) läuft oben wie ein Band, zu den Seiten steil (senkrecht + = Oberseite läuft bei axis 'x' nach +Z, bei 'z' nach +X) | `pos` (waagerecht Mitte Unterseite, senkrecht Achsmitte), `radius` 2.5, `thick` 0.6 / 1.6, `axis` 'y' \| 'x' \| 'z', `speed` 0.7 (rad/s), `angle`, `idle`, `slice` 0.3, `icing` 'rosa' \| 'weiss' \| 'schoko' \| 'gruen', `post` true (`postDown` 5) → `{ angle, speed, axis, start(), stop(), reverse(), info() }` | `{ type: 'keksrad', id: 'keks1', pos: [0, -0.6, -191.5], radius: 3 }`; senkrecht `{ …, axis: 'x', pos: [0, -2.2, -199], radius: 2.4, thick: 3 }` |
| `keks_zahnrad` | Keks-Zahnrad: waagerecht mit begehbaren Zähnen (zwei greifen ineinander: Achsabstand 2·radius + toothLen, Gegen-Drehsinn); senkrecht als Paternoster (Zähne = mitfahrende, waagerechte Plattformen, Radkörper läuft oben wie ein Band) | wie keksrad, dazu `radius` 3, `teeth` 8, `toothLen` 0.9 (mit Modell liegend: Zahnhöhe des Modells ≤ 0,45), `toothW` 1.1, `speed` 0.5 → `{ angle, speed, teeth [{ x, y, z }], start(), stop(), reverse(), info() }` | `{ type: 'keks_zahnrad', id: 'zahn2', axis: 'x', pos: [7, -1, -197], radius: 2.6, teeth: 8, speed: 0.4 }` |
| `schubfeld` | Dünen-Schubfeld: im Ritt-Level (level.river) Temposchwelle des Netzes (+boost m/s für Pflaume), Reittier-Entitäten mit `boost(dir, v, t)` werden angeschoben, zu Fuß Boost-Auslöser | `pos` (Mitte, y = Oberfläche), `dir` [dx, dz] \| yaw (Standard Fließrichtung bzw. −Z), `size` [3, 4] (Breite, Länge), `boost` 5, `speed` 15, `time` 1.3, `color` 'gold' \| 'tuerkis' \| 'rosa' → `{ hits, wave, info() }` | `{ type: 'schubfeld', id: 'schub1', pos: [0, 0, -218], size: [3, 4] }` |
| `riesenrad` | großes Rad dreht sich langsam; waagerechte Gondel-Plattformen (MovingBox) tragen Figuren und Gegner (Schubser fahren mit); Glühbirnen-Lauflicht, Ständer | `pos` (Achsmitte), `radius` 12, `gondolas` 8, `axis` 'z' \| 'x', `speed` 0.12 (+ = gegen den Uhrzeigersinn von vorn), `angle` 0, `size` [3.2, 0.45, 2.6] (Planke = Kollision), `hang` (Aufhängepunkt → Unterkante; mit Modell 1,2 + size.y, sonst 1,4), `stand` true, `ground` (pos.y − radius − 2,6; anders → eigene Böcke bis ground), `lights` true, `idle` → `{ angle, speed, gondolas [{ mb, a0 }], carried(), start(), stop(), reverse(), info() }`; Tag `riesenrad-gondel` | `{ type: 'riesenrad', id: 'rad', pos: [0, 9, -252], radius: 8, gondolas: 6, speed: 0.15, angle: -Math.PI / 2 }` |
| `lavabrocken_regen` | Brocken fliegen in hohem Bogen aus dem Vulkan auf Ziele; rote Landemarke `warn` s vorher; Einschlag trifft im Radius, Funken, Aufleuchten, optional Glutpfütze | `area` [x0, z0, x1, z1] \| `targets` [[x, y, z] …], `y`, `from` (Standard 6 m seitlich, 30 m über und 45 m hinter der Bereichsmitte), `period` 1.6, `count` 1, `flight` 1.8, `warn` 1.2, `radius` 1.1, `size` 0.6, `puddle` 0, `aim` 0 (jeder aim-te auf die Figur), `phase`, `seed` 1, `start` 'auto' \| 'signal' \| { `box`: [x0, y0, z0, x1, y1, z1] } → `{ state ('aus'\|'an'), rocks, impacts, hits, start(), stop(), info() → { state, flying, warn, impacts, hits, waves, puddles } }` | `{ type: 'lavabrocken_regen', id: 'regen', area: [-8, -292, 8, -278], period: 1.4, start: { box: [-13, -1, -296, 13, 6, -274] } }` |
| `grosser_spiegel` | großer Wandspiegel (Modell: Spukspiegel mit Bogen, Glas 0,72·h breit; eigener: rechteckiger Goldrahmen): echtes Spiegelbild (zweiter Durchgang mit gespiegelter Kamera, nur bis `reach` m vor dem Spiegel, nur wenn die Kamera näher als `near` m und davor ist); Spiegelwelt: Stern und Platten nur im Spiegel sichtbar (Ebene 5), im Raum unsichtbar, aber einsammelbar/begehbar | `pos` (Mitte Unterkante der Fläche), `size` [6, 4], `dir` [0, 1] \| `yaw`, `frame` true, `res` 512, `tint`, `near` 30, `reach` 24, `star` id (Stern aus LEVEL.stars mit { pos, id }) \| { `index`, `pos` }, `parts` [{ `pos`, `size` }], `solid` true → `{ active, renders, star, parts, inFront(x, z), mirror(x, y, z), info() }` | `{ type: 'grosser_spiegel', id: 'spiegel', pos: [0, 0, -320], size: [4.4, 6], reach: 16, star: 'spiegelstern', parts: [{ pos: [0.9, 1.1, -312.4], size: [1.6, 0.3, 1.6] }] }` |
| `super_pow_block` | riesiger, schwebender POW-Block; jeder Stoß (Kopfstoß, Stampfattacke, Sichel/Panzer/Bombe/Riesentrank, `hit()`) zählt mit Sperre `cool`; je Stoß Stauchen, Schockwelle, Kamera wackelt, Aufleuchten, Gegner am Boden onHit('bump'), Aktion `onHit`, Signal; mit jedem Stoß wird er niedriger (Oberseite size·(1 − 0,16·4·hits/hits_gesamt), wer oben steht sackt mit); nach dem letzten: `onDone`, zerspringt | `pos` (Mitte Unterseite), `size` 4, `hits` 4, `cool` 0.6, `radius` 14, `height` 4, `signal` 'super_pow', `onHit`, `onDone`, `vanish` true, `hidden` false, `rise` 2.5 → `{ hits, left, done, top (y der Oberseite), state ('versteckt'\|'kommt'\|'bereit'\|'stoss'\|'fertig'), hit(via, source), reveal(), hide(), info() }`; Tag `super_pow` | `{ type: 'super_pow_block', id: 'superpow', pos: [0, 2.3, -362], size: 3, onDone: { signal: 'finale' } }` |
| `fallblock_bruecke` | Brücke aus gelben Fallblöcken: Betreten (bzw. `start()`) → Einsturz Block für Block (`kette`, vom Anfang bzw. `beide` Richtungen) oder nur der betretene (`einzeln`); Vorwarnung wackeln; zurück nach `respawn` s; Checkpoint-Neustart setzt zurück | `from`, `to` \| `blocks` [[x, y, z] …], `size` [1.6, 0.6, 1.6], `n`, `mode` 'kette' \| 'einzeln', `dir` 'vor' \| 'beide', `delay` 0.28, `warn` 0.45, `respawn` 6, `color` 'gelb' \| 'orange' \| 'blau', `start` 'stand' \| 'signal' → `{ blocks, state ('ruhe'\|'stuerzt'\|'leer'), fallen, start(), reset(), info() → { blocks: '#'/'~'/'v'/'_' je Block } }` | `{ type: 'fallblock_bruecke', id: 'fallbr', from: [0, -0.6, -327.5], to: [0, -0.6, -342.5], size: [1.8, 0.6, 1.8] }` |
| `abspann_ausloeser` (kind) | unsichtbarer Kasten: betritt eine Figur ihn (bzw. `start()`), wird der Abspann angefordert | `pos`, `size` [4, 3, 4], `when` 'nach-ziel' \| 'sofort', `id` → `{ fired }` | `{ kind: 'abspann_ausloeser', pos: [0, 0, -380], when: 'nach-ziel' }` |
| `deco_w8` | Kulisse (eigene Geometrie verschmolzen; mit Welt-8-Kulissenmodell gebacken (statisch, mit Instanzfarben) bzw. bewegt: Karussell, Riesenrad-Kulisse, `animate: true`) | `items: [{ kind, pos, … }]`, `yaw` (Standard −π/2), `scale`, `shadow: false`, `solid: true` \| [w, h, d], `look: 'eigen'`; Rummel: bude (→ rummel_bude), wimpel (→ wimpelkette, waagerecht), gluehbirnen (→ gluehbirnenkette, waagerecht), lampions (lampionkette), mast, karussell (→ karussell), ballons (→ brummbaer_ballon), achterbahn (→ achterbahn gerade, waagerecht), torbogen, picknick · Regen: wasserspeier, pfuetze (→ regenfestung pfuetze), regentonne · Keks: keksstapel, ruehrschuessel, backofen, spritzbeutel, kruemel · Unterwasser: saeule (→ wasserfestung saeule), muscheln, anker, gitterfenster · Spukhaus: kerzenleuchter (Laternenlicht), bilderrahmen, spinnennetz, standuhr · nur als Modell: keksturm, fliessband, zuckerguss, regenmauer, regenturm, festungsfahne, algen, fallgitter, duene, autowrack, baron_turm, riesenrad_kulisse, modell ({ name, opts, state }) | `{ type: 'deco_w8', items: [{ kind: 'bude', pos: [-9, 0, -2], color: 'rot', yaw: 0, solid: true }, { kind: 'lampions', from: [-10, 4.5, -354], to: [10, 4.5, -354] }] }` |

Hinweise für Level-Bauer: Leuchtstege brauchen keinen Boden darunter (Abgrund ist gewollt); Stampfsteine über einem Steg
fallen bis auf den Steg (Raycast trifft ihn), ihr Aufschlag lässt Stege im Umkreis 8 m aufleuchten (Suchkopf 6,5 m, Stampfen
7,5 m). Kristall-Felsklotz: Unterseite 0,2 m unter die Lava-Oberfläche legen, Oberkante ≈ Plateauhöhe (Figur steigt ohne
Sprung auf); Absturz erst, wenn der Klotz die Stufe ganz verlassen hat (Mitte ≥ halbe Breite + 0,1 m hinter der Kante).
Steigbecken: Beckenrand selbst bauen (island/wall) oder `walls: true`. Keks-Zahnräder waagerecht: zwei Räder mit gleichem
`|speed|`, umgekehrtem Vorzeichen, Abstand 2·radius + toothLen greifen ineinander. Riesenrad: `angle` so wählen, dass zum
Levelstart eine Gondel unten am Steg steht; Schubser auf eine Gondel stellen (pos = Gondel-Oberkante zum Startwinkel).
Großer Spiegel: Spiegel-Stern und -Platten innerhalb der Spiegelbreite vor den Spiegel legen (sonst nie im Bild; mit dem
Spukspiegel-Modell ist das Glas nur 0,72·h breit), `reach` klein halten (Zeichenaufrufe). Super-POW-Block: der Endgegner
steht auf `top` (sinkt mit). Riesenrad mit Modell: ohne `ground` reicht das Modell-Gestell bis pos.y − radius − 2,6.

### Präzisierung (Motor und Bausteine Welt 8): Signale, Zustände, Schnittstellen

- **Aufschläge / Aufleuchten** (`w8kit`): `flash(level, x, y, z, r, { time, k, by })` lässt die Leuchtstege um den Punkt
  aufleuchten (wächst in 0,25 s auf r, verblasst über `time` 2,2 s); `w8(level).flashes` (höchstens 6 gleichzeitig),
  `w8(level).impacts` (Zähler). Erkannt werden automatisch: Stampfstein `state → 'land'` (8 m), Suchkopf/Projektilkopf
  `burst` (6,5 m), Figur landet aus der Stampfattacke (7,5 m), Lavabrocken (6 m), Felsklotz-Absturz (7 m), Super-POW-Stoß
  (≥ 10 m). **Neue Gegner** melden ihren Aufschlag mit `level.signal('aufschlag', { pos: [x, y, z], radius, by })`.
- **Super-POW-Block**: Signal `super_pow` (bzw. `spec.signal`) je Stoß mit `{ hit, of, left, done, pos, source, via, id }`
  (`via`: 'kopf' \| 'stampfen' \| 'shell' \| 'bomb' \| 'mega' \| 'throw' \| 'sichel' \| frei bei `hit(via)`); Aktionen
  `onHit`/`onDone`; Gegner mit `superPowImmune = true` (z. B. der Baron auf dem Block) bekommen keine Schockwelle,
  `flying` ebenso. Der Boss-Agent ruft `level.named.get(id).hit('boss')` nicht – Stöße kommen von den Figuren; `reveal()`
  lässt einen versteckten Block auftauchen.
- **Signal-Verben**: Felsklotz `start`/`stop`, Steigbecken (mode 'signal') `start` füllt / `stop` leert, Stachelblock/-wand,
  Keksrad/-zahnrad, Riesenrad `start`/`stop`, Lavabrocken-Regen `start`/`stop`, Fallblock-Brücke `start`, Leuchtsteg und
  Super-POW `reveal`/`hide`, Abspann-Auslöser `start`.
- **Todesursachen**: Stachelblock (damage 'tod') `'crush'`; Lava wie Welt 7 (`'lava'`).
- **Schnittstellen für Gegner-Agenten**: Sammelstelle `w8(level)` (z. B. Baron steuert alle `rains` per `start()`, liest
  `wheels[0].gondolas`); Gondeln, Felsklötze, Stachelblöcke, Fallblöcke sind MovingBoxen (Gegner mit `moveWithGravity`
  fahren mit); `grosser_spiegel`: `MIRROR_LAYER` (5) – Objekte nur im Spiegel zeigen: `obj.traverse((o) => o.layers.set(5))`
  (z. B. ein Großspuk, den man nur im Spiegel sieht); `lavabrocken_regen` mit `targets` + `start: 'signal'` als Boss-Angriff
  (geschleuderte Brocken mit Landemarken, `puddle` für Lavapfützen in 8-B).
- **Schnittstellen für Level-Agenten**: `LEVEL.credits = true` (8-Burg) oder Aktion `{ credits: true }` (z. B. `onDone` des
  Super-POW-Blocks bzw. `onDefeat` des Bosses) → nach Zielmast und Ergebnis führt „Weiter“ in den Abspann; `{ credits:
  'sofort' }` beendet das Level und startet den Abspann sofort; `{ kind: 'abspann_ausloeser', … }` als Kasten.
- **Klänge** (vorhandene Effekte über `level.sfx`): Felsklotz-Schub `boost`, Absturz `slam`; Steigbecken `splash_big`, Warnung
  `blase`; Lavabrocken `slam`; Super-POW `slam` + `boss_hit`, fertig `victory`; Fallblock `rumble`/`blockhit`;
  Super-POW auftauchen `rumble`. `tests/sfx_namen.mjs` prüft sie.

### Präzisierung (Motor und Bausteine Welt 8): Abspann

Phaser-Szene `'Credits'` (`src/course/CreditsScene.js`, registriert in `main.js`), eigene 3D-Bühne über CourseView + Level +
Bausteine (Thema `abspann`, Sommerabend auf einer Wiese bis zum Horizont): in der Mitte die Festwiese `abspann_buehne`
(Picknickdecke mit Torte, drei Lampion-Masten, die vier befreiten Freunde; ohne Modell: eigenes Picknick und Lampion-Geviert),
außen Masten mit Wimpeln, Ballons, Karussell, Buden, Torbogen (Welt-8-Kulissenmodelle), Baumkranz, Glühwürmchen und
Schmetterlinge; Lotti und Greta (auf `userData.spots`, einander zugewandt) jubeln (Avatar-Zustand `victory` im Wechsel mit
`idle`), Pflaume macht Freudensprünge, Krümel (Platz `kruemel_kapitaen`) hüpft (`cheer`), fünf weitere Freunde (bunny_small,
als Instanzen; ohne Festwiese sieben) tanzen im Reigen; die Freunde der Festwiese sitzen und wippen (`wave` 0,3–0,5) und
hüpfen ab dem Feuerwerk ausgelassen (`wave` 1); Kamerafahrt (zwei Catmull-Rom-Kurven über die ganze Musik):
Überblick → Lotti → Greta → Pflaume und Krümel → Reigen von hinten → Runde → hinauf ins Feuerwerk; Konfetti (220
Instanzen) und Feuerwerk (ab 42 % der Zeit). Danksagungen (deutsch, keine Personennamen) rollen nach oben: Titel „Lotti &
Greta“, „Mit Pflaume, Krümel und allen Freunden“, Heldinnen und Freunde mit Rollen, die Reise (Weltnamen aus den Weltkarten),
„Mit dabei“, gefundene Sterne (wenn > 0), zuletzt „Danke fürs Spielen!“ (bleibt in der Bildmitte stehen). Musik
`course_abspann` spielt einmal (`music.themeInfo('course_abspann').seconds` ≈ 76 s); danach noch 3 s, dann Weißblende zur
Weltkarte (`CourseMap`, `{ from, credits: true }` – Meldung „Spiel geschafft – danke fürs Spielen!“). „Weiter ›“ bzw.
Enter/Leertaste überspringt ab 3 s. Spielstand: `courseSave.data.finished = true` (additiv, schon beim Start des Abspanns),
`courseSave.data.finishedVisits` zählt; die Karte zeigt dann einen goldenen Pokal rechts am Weltschild (`hud.trophyShown`).
Die Kamerafahrt richtet sich nach den Plätzen der Figuren (Festwiese: `userData.spots`, y = Wölbung der Wiese).

Aufruf: `this.scene.start('Credits', { from: '8-Burg' })`; aus dem Level siehe oben (`src/course/credits.js`:
`requestCredits(level, 'nach-ziel' | 'sofort')`, `creditsWanted(scene)`, `startCreditsFrom(scene, from)`); URL `?credits=1`.
Test-Schnittstelle `window.__credits`: `setManual(b)`, `advance(s)` (Zeitleiste in 1/30-s-Schritten), `state()` → { t,
duration, end, music, playing, roll, lines, shown, finished, ending, actors, confetti, fireworks, stage, camera },
`finish()`, `stats()`.

### Präzisierung (Motor und Bausteine Welt 8): Modelle

Abbildung der Bausteine auf die Welt-8-Modelle (genaue opts/state in den Kopfkommentaren von `models/kinds/*_w8.js`):

| Baustein | Modell | opts / state aus dem Baustein |
| --- | --- | --- |
| `leuchtsteg` | `createInstanced('leuchtsteg', n, { thick: 0.3 })` | je Platte ≈ 1-m-Kacheln (`setAt(i, [x, y0, z], 0, [sx, h / 0,3, sz])`), state { glow: Sichtbarkeit der Kachelmitte bzw. Aufleuchten, flash } |
| `kristall_felsklotz` | `kristall_felsklotz` | { size, shape 'kugel' \| 'wuerfel' }; state { anim 'idle' \| 'roll' \| 'fast', roll (Weg/Radius bzw. ¼ Drehung je Kante), speed }; Rollrichtung = Fahrtrichtung |
| `steigbecken` (walls) | `steigbecken` | { size [w, d], height h + 0,3, wall 0,5 }; state { level = (Wasserspiegel − Boden) / height }; Motor-Wasser unsichtbar |
| `wasserkoerper` | `wasserkoerper` | { size [w, h, d] }; state { wobble: 1 beim Hinein-/Herausspringen, abklingend, 0,25 solange jemand darin ist } |
| `stachelblock`, `stachelwand` | `stachelblock_blau` / `stachelblock_rot` | { size, faces }: vier Seiten + oben → 'alle', vier Seiten → 'seiten', oben → 'oben', genau eine Seite → 'vorn' (gedreht, size [Tiefe, Höhe, Breite]); andere Kombinationen: eigene Geometrie; state { out: 1, warn } |
| `keksrad` | `keksrad` | { size 2·radius, thick, axis, color: icing 'schoko' → 'schoko', sonst 'hell' }; state { angle } (axis 'z': −angle); liegend um thick/2 angehoben |
| `keks_zahnrad` | `keks_zahnrad` | { radius (liegend: radius + Zahnhöhe), teeth, thick, axis }; state { angle }; Kollisions-Zähne bei (k + 0,375)/teeth·2π |
| `schubfeld` | `schubfeld` | { size [Länge, Breite] }, gedreht auf `dir`; state { on: true, speed: 1 } |
| `riesenrad` | `riesenrad` | { radius, count, plank [w, d], depth max(2,6, d + 0,4), stand }; state { angle }; Planken-Oberseite = Kollisions-Oberseite |
| `lavabrocken_regen` | `lavabrocken_regen`, `landemarke`, `lavapfuetze` | Brocken { size }: 'fall' (Schweif gegen die Flugrichtung), 'land' mit progress über 0,8 s; Marke { size [2,6·radius, 2,6·radius], shape 'kreis' }, state { k }; Pfütze { size 1,6·radius }: 'grow' → 'idle' → 'cool' |
| `grosser_spiegel` | `spukspiegel` | ohne opts, gleichmäßig skaliert (s = h / 3,05), Sockel unter pos.y versenkt; state { star: false, glow: 1 }; Spiegelfläche in der Bogenform des Glases |
| `super_pow_block` | `super_pow_block` | { size }; state { hits (auf 0..4 umgerechnet), anim 'hit' mit progress 0,7 s nach jedem Stoß, sonst 'idle' } |
| `fallblock_bruecke` | – | eigene Blöcke (eine InstancedMesh); ein künftiges Modell `fallblock` ({ size, color }, state { warn }) würde übernommen |
| `deco_w8` | `rummel_bude`, `karussell`, `wimpelkette`, `gluehbirnenkette`, `brummbaer_ballon`, `achterbahn`, `regenfestung`, `keksfabrik`, `wasserfestung`, `duene`, `autowrack`, `baron_turm`, `riesenrad_kulisse` | siehe Liste oben; gebacken mit `bakeW8` (Instanzfarben), Karussell und Riesenrad-Kulisse bewegt |
| Abspann | `abspann_buehne` | { size 1 }; state { wave, glow: 1 }; `userData.spots` → Plätze der Hauptfiguren |

### Präzisierung (Motor und Bausteine Welt 8): Themen

| Thema | Name | Stimmung / Hintergrund (`backdrop_w8.js`) |
| --- | --- | --- |
| `rainfort` | Regenfestung | Dauerregen (Regenstriche um die Kamera), Gewitterhimmel ohne Schreck (sanftes Wetterleuchten), Türme im Dunst, Fensterlichter spiegeln sich im nassen Graben, glänzendes Gelände (`toy.spec`) |
| `dunes` | Dünen im Abendrot | Dünenmeer im Abendlicht, tiefe Sonne, Baron-Sandstatuen am Horizont, wehender Sand |
| `cookie` | Keksfabrik | Fabrikhalle in Zuckerguss-Streifen, drehende Keks-Zahnräder, Förderbänder, Zuckerdampf, Puderzucker |
| `nightfort` | Nacht-Festung | fast schwarz, blasse Sterne, Turm-Silhouetten mit wenigen Lichtern; Figurenlicht und kräftiges Randlicht (Figuren lesbar), Leuchtstege = Licht |
| `dungeon` | Unterwasser-Festung | Bogenmauern, glimmende Gitterfenster, Ketten, Lichtschächte, Seetang, Blasen; Unterwasser-Stimmung automatisch |
| `darkghost` | Finsteres Spukhaus | stockdunkel, schemenhafte Wände, blinzelnde Geisteraugen, Staub; schwaches Figurenlicht, Laternenlicht an Kerzen |
| `inferno` | Lava-Inferno | Lavasee bis zum Horizont, Felsnadeln mit lila/eisblauen Kristallen, glühende Vulkane, Funken |
| `baronpark` | Brummbär-Rummelplatz | Abendhimmel, großer Baron-Turm, Riesenrad (dreht), Achterbahn, Zelte mit Lichterketten, Rummel-Pflaster mit Laternen |
| `abspann` | Abendwiese | Sommerabend, Wiese bis zum Horizont (Abspann; auch `?theme=abspann`) |

`train`, `circus`, `house` sind vorhanden. Jedes Thema lässt sich in `0-31` mit `?theme=<name>` ansehen.

### Präzisierung (Motor und Bausteine Welt 8): Welt 8 – Gimmick → Baustein

| Gimmick (Bauplan) | Baustein |
| --- | --- |
| Stachelbrücken im Takt (8-1) | `stachelwalze_rot`/`klappstampfer` (Welt 7); Stacheln im Takt aus der Brücke: `stachelblock` (blau, `spikes: ['oben']`, Oberkante knapp unter der Brückenfläche, `move: [0, 0.6, 0]`, `wait`/`warn` als Takt) |
| Schubfelder in der Wüste, Ritt auf Pflaume (8-2) | `schubfeld` (Ritt-Netz/raft/zu Fuß) |
| drehende Kekse und Keks-Zahnräder (8-3) | `keksrad`, `keks_zahnrad` |
| unsichtbare Stege, Aufleuchten bei Aufschlägen/Stampfen (8-4) | `leuchtsteg` (+ Stampfstein, Suchkopf, Signal `aufschlag`) |
| Steigbecken, schwebende Wasserkörper (8-5) | `steigbecken`, `wasserkoerper` |
| blaue/rote Stachelblöcke, wandernde Stachelwände (8-5) | `stachelblock`, `stachelwand` |
| Fallblock-Brücke (8-5), Fallblock (8-1) | `fallblock_bruecke` (`mode: 'einzeln'` für einzelne Fallblöcke) |
| großer Spiegel mit Spiegelbild-Stern (8-6) | `grosser_spiegel` (+ Thema `darkghost`, Licht-Helm) |
| Kristall-Felsklötze, Würfel mit Abstürzen, Lavahang, Kurvenroute (8-7) | `kristall_felsklotz` (`variant`, `path`, `slope`) |
| Lavabrocken-Regen aus dem Vulkan, Lavapfützen (8-Burg, 8-B) | `lavabrocken_regen` (`puddle`) |
| Riesenrad mit 4 Schubsern (8-Burg) | `riesenrad` (+ `schubser` auf Gondeln) |
| Super-POW-Block 4× anstoßen (8-Burg) | `super_pow_block` (Signal `super_pow`) |
| Abspann nach dem Sieg (8-Burg) | `CreditsScene` (`LEVEL.credits`, Aktion `{ credits }`, `abspann_ausloeser`) |
| Rummel-, Regenfestungs-, Keksfabrik-, Unterwasser-, Spukhaus-Kulisse | `deco_w8` |

### Präzisierung (Motor und Bausteine Welt 8): Tests und Kennzahlen

`tests/course_w8_blocks.mjs` (Port 4760, `W8B_PART=mech|themes|credits`, `W8B_SHOTS=0` ohne Bilder, `W8B_DEBUG=1`): je
Mechanik mit Gegenprobe – Leuchtsteg (unsichtbar begehbar, sichtbar nur um die Figur, 5,8 m daneben unsichtbar;
Stampfstein-Aufschlag, Stampfattacke und Signal lassen ihn aufleuchten, danach verblasst er), Kristall-Felsklotz (ruht ohne
Figur, fährt mit ihr los, Stampfen beschleunigt, versinkt und kommt wieder; Würfel mit zwei Abstürzen, Figur fährt heil mit),
Steigbecken (Takt, leer: steht, voll: schwimmt), Wasserkörper (drinnen schwimmen, daneben stehen, unten hinaus fallen),
Stachelblock (Stacheln treffen, 1 m davor heil; blau Takt mit Pausen, rot ohne Pause, Wand rückt vor), Keksrad (Drehteller
nimmt mit, angehalten nicht; senkrecht Band), Keks-Zahnrad (Zahn trägt), Schubfeld (drüber schnell, daneben normal),
Riesenrad (dreht, Gondel trägt Figur, Schubser fährt auf seiner Gondel mit), Lavabrocken-Regen (startet erst im Bereich,
Landemarken, trifft am Ziel, daneben heil), großer Spiegel (Spiegel-Durchgang, Stern nur auf Ebene 5, Spiegel-Stufen
begehbar, Stern einsammelbar), Fallblock-Brücke (alle fest → Einsturz Block für Block, Figur fällt mit), Super-POW-Block
(Kopfstoß und Stampfen zählen, Sperre, vier Signale, onDone), Abspann-Auslöser, Hüllen als kind, Ziel; Themen (acht Namen
und Kulissen, nightfort/darkghost dunkel mit Figurenlicht, dungeon unter Wasser); Abspann (?credits=1 startet, Musik
`course_abspann` ohne Schleife endet von selbst, Darsteller/Konfetti/Feuerwerk, Texte rollen von „Lotti & Greta“ bis „Danke
fürs Spielen!“, `finished` gespeichert, zurück zur Karte mit Pokal, Weg aus dem Level über `{ credits }`); keine
Konsolenfehler. Stand: mech 32/32, themes 4/4, credits 9/9 (je < 10 min, nacheinander); Regression course_physics 19/19,
course 46/46, course_w7_blocks 48/48 + 4/4, course_w6_blocks (mech) 48/48, course_motor_fixes 37/37, course_map 46/46,
sfx_namen grün.

Kennzahlen der Bilder (Zeichenaufrufe inkl. Schattenpass und Spiegel-Durchgang / Dreiecke; Budget < 120 / < 300 k):

| Bild | Aufrufe | Dreiecke | | Bild | Aufrufe | Dreiecke |
| --- | --- | --- | --- | --- | --- | --- |
| leuchtsteg | 57 | 123 k | | thema_rainfort | 62 | 123 k |
| felsklotz | 69 | 93 k | | thema_dunes | 53 | 110 k |
| wasser | 56 | 134 k | | thema_cookie | 56 | 177 k |
| stachel | 63 | 212 k | | thema_nightfort | 40 | 59 k |
| keks | 47 | 196 k | | thema_dungeon (+ Würfel, unter Wasser) | 52 / 69 / 54 | 96 k / 147 k / 152 k |
| schubfeld | 41 | 103 k | | thema_darkghost (Spiegel) | 88 | 98 k |
| riesenrad | 77 | 157 k | | thema_inferno | 63 | 79 k |
| lavaregen | 38 | 82 k | | thema_baronpark (+ Start) | 84 / 58 | 144 k / 119 k |
| spiegel (mit Spiegel-Durchgang) | 78 | 162 k | | abspann_start (Überblick) | 94 | 290 k |
| fallblock | 64 | 147 k | | abspann_freunde | 93 | 277 k |
| superpow | 43 | 92 k | | abspann_reise | 88 | 268 k |
| start | 50 | 134 k | | abspann_danke | 67 | 212 k |

Der Spiegel-Durchgang zeichnet nur, was näher als `reach` am Spiegel und vor ihm liegt (auch Sprites und Objekte ohne
Sichtprüfung über ihre Grenzkugel + 3 m), und schaltet sich ab, wenn die Kamera weiter als `near` entfernt ist.

## Präzisierung (Gegner Welt 8)

Ergänzung des Gegner-Agenten Welt 8 „Brummbär-Rummelplatz“ (Stand: Rummel-Gegnerzoo `0-32`, Rummel-Bossarenen `0-33`).
Nichts oben Festgelegtes wird geändert; alles ist additiv. Level-Bauer schreiben nur Daten; alle Felder sind optional, sofern
nicht anders vermerkt. Gemeinsame Felder und Konter aus „Präzisierung (Gegner/Power-ups)“ und „(Gegner Welt 2–7, Halloween)“
gelten weiter (`id, pos, dir|yaw, path, loop, wake, edges, drop`; Ziel = nächste Figur, Lava/Absturz = besiegt, Pilz-Maske über
`maskedFrom`). Jede Datei dokumentiert ihre Parameter vollständig im Kopfkommentar. Angebunden an die Welt-8-Modelle
(„Präzisierung (Modelle Welt 8)“) und an die Motor-Bausteine („Präzisierung (Motor und Bausteine Welt 8)“: `super_pow_block`,
`riesenrad`, `lavabrocken_regen`, Signal `aufschlag`, Abspann `{ credits: true }`) – keine eigenen Ersatzlösungen, wo der
Motor etwas anbietet (Rückfälle nur, wenn ein Baustein fehlt). Kindgerecht: besiegte Knochenflieger fallen klappernd zu
Knochenhaufen, Sandfiguren zerbröseln, Doppelgänger platzen in Funken, der Baron fliegt am Ende rudernd mit dem Zylinder in der
Tatze davon.

### Präzisierung (Gegner Welt 8): Dateien

```
src/course/entities/w8help.js                     Hilfen (außerhalb kinds/): POWER_HIT, isSichel, sandTop (Dünennetz/Boden),
                                                  groundBelow, Track (Bahn als Bogenlänge), Markers (Landemarken 'boss_marker'),
                                                  fallingStar, CarriedStar, archOf, bannerOf, glint, impact (Signal 'aufschlag')
src/course/entities/kinds/sandflosser_w8.js       sandflosser
src/course/entities/kinds/knochenschwarm_w8.js    knochenflieger_gruppe (+ Glieder knochenflieger_glied)
src/course/entities/kinds/sandstatue_w8.js        baron_sandstatue, pilzling_sandskulptur
src/course/entities/kinds/varianten_w8.js         schockwelle, lavapfuetze, ameisen_reihe
src/course/entities/kinds/baron_krallen_w8.js     baron_krallen (Endgegner 8-Burg), baron_klon, bruchstueck, baron_superpow (Rückfall)
src/course/entities/kinds/kaefer.js               + Flatterkäfer mit Stern (star | carries 'star:I')
src/course/entities/kinds/spuk.js                 + Jäger (hunt, trigger, huntSpeed …), kreisgeist_kreis bis 40 Geister je Ring
src/course/entities/kinds/schubser_w6.js          + group, fallDefeat, onGroup, fährt auf Gondeln/MovingBoxen mit
src/course/entities/kinds/wuerfelblase_w6.js      + color 'gold' (8-A: Schockwellen, schneller)
src/course/entities/kinds/schlangenkoenig.js      + color 'rosa' (8-B: Lavabrocken hinterlassen Lavapfützen)
src/course/entities/kinds/schattenlaeuferin.js    + round 2 (8-Zug: mehr Doppelgänger, schneller)
src/course/levels/w0/0-32.js                      Rummel-Gegnerzoo (10 Reihen, Z(r, dz) = −8 − 20(r − 1) − dz, Thema desert)
src/course/levels/w0/0-33.js                      Rummel-Bossarenen (LEVEL.bosses: goldene Würfelblase, rosa Schlangenkönig,
                                                  Schattenläuferin 2, Baron im Krallen-Anzug mit Turm/Spiegel/Gipfel)
tests/course_w8_enemies.mjs                       Port 4790, W8E_PART=1|2|3|4, Bilder tests/out/w8e_*.png
```

Modelle: `sandflosser` (sonst `glotzfisch` gelb), Instanz-Gruppe `knochenflieger` (lib/instanced_w8.js: 'fly' | 'dive' |
{ anim: 'bones' | 'assemble', progress }; alle Schwärme eines Levels = 4 Zeichenaufrufe), `baron_sandstatue` ({ break }),
`sandskulptur_pilzling` ({ height, hole, toys }), `flatterkaefer`, `spuk`, `kreisgeist_kreis` (alive als Liste),
`schockwelle` ({ radius, color }), `lavapfuetze`, `lavabrocken_regen` (Lavabrocken des Schlangenkönigs), `wuerfelblase`
({ color: 'gold' }), `schlangenkoenig` ({ color: 'rosa' }), `baron_krallen` ({ clone } für Doppelgänger; anim idle | climb |
fire | swipe | slide | eat | clone | thrown | launched | stunned | defeated | flee mit Hut in der Tatze), `freunde_glas`
({ size, friends }; state shake/break/cheer), `boss_marker`, `super_pow_block` (Motor). Unverändert geprüft (nur Daten):
`pilzling` mit `mini: true` (Mini-Pilzlinge), `hackvogel`, `krallen_pilzling`, `feuer_werfer`, `hammer_werfer`,
`wutkaulquappe` (Welt 7), `ameisensoldat_horn` (Welt 4), `riesenschnappblume` (Welt 2/5; Wurfsichel = 1 Treffer).

### Präzisierung (Gegner Welt 8): gemeinsame Regeln

- **POWER_HIT** (w8help.js) = claw, fire, sichel, throw, shell, cannon, bomb, mega, star, punch, bite, tail, crush, pow – Angriffe
  der Figur mit Power-up bzw. Wurfgegenstand; sie besiegen Welt-8-Gegner **endgültig** (Knochenflieger ohne Neu-Zusammensetzen,
  Doppelgänger platzen, Sandfiguren zerbröseln).
- **Wurfsichel** (Motor `onSichelHit` bzw. `onHit('throw', sichel)`): Knochenflieger endgültig, Sandflosser im Sprung besiegt,
  Sandfiguren zerbröseln, Flatterkäfer besiegt (Stern fällt), Doppelgänger platzen, Hörner-Ameisen besiegt, Spuk/Kreisgeist
  bleiben heil (wie Welt 7), Riesenschnappblume −1 Treffer, Baron zuckt („Kratzer!“, Angriff unterbrochen, kein Schaden).
- **Pflaume-Ritt** (8-2): Sandflosser kündigen jeden Sprung an (warn s, Sand brodelt, rote Schattenmarke an der Landestelle);
  Sandfiguren zerbröseln, wenn die reitende Figur sie rammt (Ritt-Level `riding` bzw. Reittier `mode 'mount'`).
- **Aufschläge** (Motor, Leuchtstege): Schockwellen (je Welle, Radius min(12, radius)), Lavapfützen (6 m), Baron-Landungen und
  -Würfe (7 m), Doppelgänger-Landungen (5 m) und abstürzende Bruchstücke (6 m) melden `level.signal('aufschlag', { pos, radius, by })`.
- **Super-POW-Block** (Motor): der Baron hat `superPowImmune = true` (keine Schockwelle), steht auf `top` und sackt mit ab;
  Doppelgänger und Gegner am Boden bekommen die Schockwelle (`onHit('bump')` → Doppelgänger platzen). Stöße kommen nur von den
  Figuren.
- **Bewegte Plattformen** (Riesenrad-Gondeln, Felsklötze, Fallblöcke = MovingBoxen): Gegner fahren mit; der Schubser nimmt
  seinen Heimplatz mit (er bleibt auf seiner Gondel).
- **Sound** nur über vorhandene `level.sfx`-Namen: `dig`, `splash`, `stomp`, `sand_crumble`, `hover`, `swoop`, `blockhit`,
  `step`, `switch`, `poof`, `brickbreak`, `powerup_appear`, `slam`, `burn`, `claw`, `fireball`, `wallslide`, `rumble`, `clone`,
  `berry`, `boss_hit`, `victory`, `panic`, `hop`, `land`, `bounce`, `gong`, `powerdown` (`tests/sfx_namen.mjs` grün).
- **Zeichenaufrufe**: Knochenflieger aller Gruppen teilen eine Instanz-Gruppe, Kreisgeist-Ringe sind je ein Instanz-Modell
  (3 Aufrufe); 44 Kreisgeister + 24 Knochenflieger im Bild ≈ 39 Zeichenaufrufe (gesamte Szene).

| Gegner | Verhalten | besiegt durch | verletzt |
| --- | --- | --- | --- |
| sandflosser | schwimmt unter der Düne (Flosse sichtbar, unberührbar), kündigt an (Schattenmarke), springt im Bogen (pendelnd / Bahn / Kreis / zielend auf die Figur) | im Sprung: Draufspringen/Stampfen, alle Angriffe, Wurfsichel; mit `star`: Stern fällt in den Sand | Berührung im Sprung (seitlich) |
| knochenflieger_gruppe | 3–8 Flieger in Formation (Ring/Linie/Welle/Keil), ziehen ihre Bahn, Ankündigung (klappern), gemeinsamer Sturzflug | Draufspringen/Stampfen/Rutschen → Knochenhaufen, setzt sich nach `respawn` s neu zusammen; endgültig: POWER_HIT, Wurfsichel, Stampfen auf den Haufen, `respawn: false` | seitliche Berührung (Flug, Sturzflug) |
| baron_sandstatue / pilzling_sandskulptur | Hindernis aus Sand (kein Gegner); trägt, hält seitlich auf | Ritt, Rammen (≥ 6,5 m/s), Stampfattacke, POWER_HIT, Wurfsichel → zerbröseln; star/content/minis | nie |
| flatterkaefer + star | fliegt seine Bahn, trägt den Stern unberührbar unter sich | wie bisher (von oben, Angriffe, Wurfsichel) – Stern fällt herab | wie bisher |
| spuk (hunt) | lauert bis zum Auslöser, jagt dann unablässig (angeschaut langsam, holt weit weg auf) | Licht-Helm (Großspuk 2,2 s), Funkelstern, Riese | jede Berührung |
| kreisgeist_kreis | Ring bis 40 Geister, dreht sich, schaut auf | Licht (je Geist), Funkelstern, Riese | jede Berührung |
| schubser (group) | wie Welt 6; auf Gondeln/Plattformen, fährt mit | hinunterstoßen (`fallDefeat`), Lava, Wasser, wie bisher | Stoß |
| ameisen_reihe | Hörner-Ameisen marschieren in Reihen aus einem Loch ins nächste, endlos | Ameisen wie Welt 4 (Horn: nicht von oben; Angriffe, Wurfsichel) | Horn von oben, seitlich |
| schockwelle | Ring am Boden wächst (0,45 m hoch) | – (drüberspringen) | Berührung am Boden |
| lavapfuetze | breitet sich aus (harmlos), heiß, kühlt ab | – | darin stehen (heiß) |
| baron_klon | Spiegelfrucht-Doppelgänger, springt herab (Landemarke), stürmt seine Bahn | Draufspringen/Stampfen, POWER_HIT, Wurfsichel, POW → platzt | seitlich |
| bruchstueck | Wand-/Wegstück; Vorwarnung (glüht, wackelt), bricht, stürzt (Schattenmarke) | – | stürzend darunter |

### Präzisierung (Gegner Welt 8): Gegner-Daten (exakt, mit Beispiel)

```js
enemies: [
  // Sandflosser: pos = Sandoberfläche (y = Düne; im Ritt-Level liest er level.river.sample); Bahn path [[x, y, z], …] + loop |
  //   center + radius 3 + cw | dir [dx, dz] + dist 6 (hin und her) | ohne: springt abwechselnd um pos (pos ± dir · jump/2);
  //   start 0..1 (Startstelle), speed 2.5 (m/s unter dem Sand), every 3.2 (s je Sprung), phase 0..1, warn 0.8 (Vorwarnung mit
  //   Schattenmarke), flight 1.2, height 2.6, jump 5 (m), aim false (springt der Figur in sight 14 m entgegen: Landestelle = ihre
  //   Lage in lead 0.7 s, 0,6 … 1,6 · jump weit; danach zurück zur Bahn), star true | Index (Stern fällt beim Besiegen), drop
  { kind: 'sandflosser', pos: [0, 0, -40], dir: [1, 0], dist: 8, every: 3, star: 0 },
  { kind: 'sandflosser', pos: [6, 0, -70], aim: true, sight: 10, every: 3.4, phase: 0.5 },
  // Knochenflieger-Gruppe: pos = Mitte der Formation (y = Flughöhe der Körpermitten); count 5 (3–8), formation 'ring' |
  //   'linie' | 'welle' | 'keil', radius 1.8 (Ring), spacing 1.5, Bahn center + orbit 4 + cw | path + loop | ohne: schwebt;
  //   speed 2.2, spin 0.7 (rad/s, Ring), sight 7 (0 = stößt nie herab), reach 7, dive 8.5, warn 0.8, cooldown 2.6,
  //   respawn 4 (s bis zum Neu-Zusammensetzen) | false, rebuild 1.2, bob 0.15, phase 0..1, drop (je Flieger, nur endgültig),
  //   onAll (Aktion, wenn alle endgültig besiegt sind)
  { kind: 'knochenflieger_gruppe', id: 'kg1', pos: [0, 5, -60], count: 6, formation: 'ring', center: [0, 5, -60], orbit: 3 },
  { kind: 'knochenflieger_gruppe', id: 'kg2', count: 4, formation: 'linie', path: [[-6, 5, -80], [6, 5, -80], [6, 5, -90]], loop: true },
  { kind: 'knochenflieger_gruppe', id: 'kg3', pos: [0, 5.5, -100], count: 5, formation: 'keil', respawn: false, onAll: { star: 1 } },
  // Flatterkäfer mit Stern (nur der erste einer Kolonne trägt ihn)
  { kind: 'flatterkaefer', path: [[-4, 3, -50], [4, 3, -50]], loop: true, star: 2 },   // bzw. carries: 'star:2'
  // Großspuk als Jäger (8-6): lauert, bis eine Figur trigger betritt (ohne trigger: näher als sight), jagt dann; huntSpeed 2.4
  //   (Großspuk; sonst 2.8), shySpeed 0,35 · huntSpeed (angeschaut), catchUp 10 (weiter weg: 1,6-fach), giveUp ∞
  { kind: 'spuk', id: 'jaeger', pos: [0, 1.4, -200], size: 2.5, hunt: true, trigger: { min: [-4, 0, -186], max: [4, 4, -182] } },
  // Kreisgeist-Ring (bis 40 je Ring; 44 Geister = mehrere Ringe)
  { kind: 'kreisgeist_kreis', pos: [0, 1.2, -40], count: 11, radius: 2.6, speed: 1.4, cw: true },
  // Schubser auf dem Riesenrad (8-Burg): pos = Gondel-Oberkante zum Startwinkel (+0,3 m); group, fallDefeat (m Fall unter den
  //   letzten Stand = hinuntergestoßen), onGroup (Aktion, wenn der letzte der Gruppe besiegt ist; an einem Schubser genügt)
  { kind: 'schubser', id: 'rs1', pos: [-3.7, 4.2, -218], behavior: 'guard', sight: 2.5, group: 'riesenrad', fallDefeat: 1.6, onGroup: { star: 2 } },
  // Bestand (unverändert): Mini-Pilzlinge, Hackvogel, Krallen-Pilzling, Riesenschnappblume, Werfer, Wutkaulquappe
  { kind: 'pilzling', mini: true, pos: [2, 1, -30], behavior: 'chase', sight: 6 },
  { kind: 'hackvogel', pos: [4, 1, -36], dir: [-1, 0], period: 2.0 },
  { kind: 'riesenschnappblume', pos: [0, 1, -44] },
],
items: [
  // Baron-Sandstatue: pos = Mitte der Sockel-Unterseite, size 1 (≈ 4,1 m), yaw −π/2, star Index | { index, pos }, content
  //   (Aktion), sparkle false; Kollision Sockel 2,2 × 1,0 × 2,2 (bleibt) + Figur (fällt weg)
  { kind: 'baron_sandstatue', id: 'statue1', pos: [-6, 0, -120], star: 1 },
  // Pilzling-Sandskulptur: height 2.6, minis 0 (Mini-Pilzlinge springen heraus), toys false, star, content, sparkle
  { kind: 'pilzling_sandskulptur', pos: [6, 0, -130], minis: 2 },
  // Hörner-Ameisen-Reihe (8-3): from/to = Löcher (Mitte am Boden), horn true, lanes 1, gap 1.3, every 2.2, speed 1.5, max 8 (je
  //   Reihe), prefill true, phase 0..1, holes true (Erdkrater zeichnen; Begehbarkeit bauen die Level-Bauer), ride false
  { kind: 'ameisen_reihe', id: 'ameisen', from: [-8, 0, -60], to: [8, 0, -68], lanes: 2, gap: 1.4, every: 2.4 },
  // Wand-/Wegstück: pos = Mitte der Unterseite, size [2, 1, 2], climbable false, look 'stein' | 'holz' | 'rummel', color, warn 1.0
  { kind: 'bruchstueck', id: 'steg1', pos: [0, 20, -210], size: [1.5, 0.6, 4], look: 'holz' },
],
// frei nutzbar (z. B. eigene Fallen): Schockwelle { pos (Mitte am Boden), radius 6, r0 0.5, speed 7, height 0.45, color 'gold' |
//   'weiss', impact true }, Lavapfütze { pos, size 2.2, grow 0.5, life 4, cool 1.6, impact true } – per level.spawn(kind, spec).
```

Laufzeit (Tests, Gimmicks): Sandflosser `state` (swim | warn | jump | land | return | defeated), `jumps`, `apex`, `jumpFrom/jumpTo`,
`marked`, `star`; Gruppe `state` (fly | warn | dive), `dives`, `members`, `aliveCount`, `formed`, `rebuilds`, `allGone`; Glied
`state` (form | wait | dive | rise | bones | rebuild | gone), `bonesT`, `defeated`; Sandfigur `broken`, `by` ('ritt' | 'rammen' |
'stampfen' | Angriffsart); Flatterkäfer `carried`, `starDropped`; Spuk `hunting`, `huntTime`; Kreisgeist-Ring `aliveCount`,
`aliveList`; Schubser `group`, `fellBy`; Ameisen-Reihe `streams`, `aliveCount`, `spawned`, `holes`; Bruchstück `state` (ganz |
warn | fall | weg), `breaks`, `hurts`, `startWarn(t)`, `restore()`. Alle mit `info()`.

### Präzisierung (Gegner Welt 8): Varianten (8-A, 8-B, 8-Zug)

```js
// goldene Würfelblase (8-A): Arena und Ablauf wie 6-C, 3 Kopftreffer; schneller (air [1.1, 0.95, 0.85], rest [0.8, 0.65, 0.5],
//   bitSpeed [1.8, 2.1, 2.4], flee [4.0, 3.6, 3.2], fleeSpeed [3.4, 4.0, 4.6]); jede Riesen-Landung: waves goldene Schockwellen
//   (Radius shockR 8, shockSpeed 8, waveGap s Abstand), Sprung der Blase selbst: kleine Welle (Radius 4) – alle überspringbar
{ kind: 'wuerfelblase', id: 'blase', color: 'gold', pos, arena: { center, r }, waves: 2, waveGap: 0.45, star: { pos, index } }
// rosa Schlangenkönig (8-B): Ablauf wie 3-B; geschleuderte Steine sind Lavabrocken, die auf dem Boden eine Lavapfütze
//   hinterlassen (nicht auf Tellern/Sockel; höchstens max zugleich, die älteste kühlt ab); Kuppel-Steine bleiben Felsbrocken
{ kind: 'schlangenkoenig', id: 'koenig', color: 'rosa', pos, arena: { center, r }, plate: 2.8,
  puddle: { size: 2.2, life: [4, 4.5, 5], max: 5 } | false, star: { pos, index } }
// Schattenläuferin 2 (8-Zug): zweiter Kampf, mehr Doppelgänger (clones [3, 4, 6]), Würfe throws [2, 3, 3], werfen: Original +
//   phase + 1 Doppelgänger (throwers [2, 3, 4]), Wurfsterne speed 8.5 / range 10, alle Zeiten × 1/tempo
{ kind: 'schattenlaeuferin', id: 'schatten', round: 2, tempo: 1.25, pos, arena: { center, r }, ring: 5 }
```

Ansagen: „Heiße Lavapfützen – nicht hineintreten!“, „Die Schattenläuferin ist zurück!“, „Noch mehr Doppelgänger!“, „Jetzt ist
sie noch flinker!“. Tod im Kampf/Sieg: Wellen und Pfützen verschwinden bzw. kühlen sofort ab. Laufzeit `gold`, `goldWaves`,
`waveHits`; `puddles`, `puddlesMade`; `round`, `tempo`. Alle drei hängen am Boss-Archetyp wie ihre Vorbilder (LEVEL.boss /
LEVEL.bosses, `bossManaged`).

### Präzisierung (Gegner Welt 8): Baron Brummbär im Krallen-Anzug (8-Burg)

Eine Boss-Entität mit **Abschnitts-Steuerung**: der Level-Bauer legt die Abschnitte entlang des Turms an, der Baron spielt sie
nacheinander (Beginn: eine Figur betritt den `trigger`-Kasten des Abschnitts). Lebensleiste „Baron Brummbär“ mit 4 Stufen
(`hp: 4`; nur der Gipfel zieht Stufen ab), Fanfare (`victory`) am Ende jedes Abschnitts, Gong und Ansage je Gipfel-Phase.
Jede Gefahr kündigt sich an (Wandstück glüht/wackelt, Landemarken, Knurren vor dem Rutschen), zwischen zwei Angriffen ist
immer Pause (`every` s).

```js
enemies: [{ kind: 'baron_krallen', id: 'baron', pos: [x, y, z] (Wartestelle vor dem ersten Abschnitt), hp: 4, seed, onWin,
  sections: [
    // Turm unten: klettert vor der Figur (lead m über ihr; wartet, wenn sie zurückbleibt); route-Punkte [x, y, z, wx, wz]
    //   (Fußpunkte; [wx, wz] = Richtung zur Wand → dort klettert er, Wand 0,8 m vor ihm; ohne läuft er); Angriffe reihum:
    //   Feuerball (Bogen mit Landemarke bzw. gerade), Krallenhieb auf ein nahes Wandstück (swipeR m; Vorwarnung warn s),
    //   Rutschen (steht die Figur unter ihm an seiner Wand: 0,5 s Knurren, slide m herab). Oben wacht er am POW-Block
    //   (guard, Sperre block solange er wacht) – trifft eine Figur den POW-Block, wird er weggeschleudert (throwTo), die Sperre
    //   fällt, Signal signal ?? 'baronPow', Abschnitt geschafft. Ohne pow endet der Abschnitt am end-Kasten.
    { type: 'turm', id: 'unten', trigger: { min, max }, route: [[0, 2, -150, 0, -1], [0, 17, -150, 0, -1], [0, 17, -156]],
      lead: 3.5, climb: 2.2, walk: 2.6, sight: 22, every: 2.6, fire: { shots: 1, speed: 6.5, arc: true, flight: 1.0 },
      slide: 4, slideSpeed: 5, walls: ['wand1', 'wand2'], swipeR: 2.6, warn: 1.2, pow: 'pow_turm', guard: [1.6, 17, -156.5],
      block: { min, max }, throwTo: [9, 28, -166], signal: 'baronPow', end, banner, rain },
    // Oberer Turm: klettert/läuft voraus (follow 'weg': ahead m vor der Figur entlang der Route | 'hoehe' wie im Turm), frisst
    //   Spiegelfrüchte (fruits am Weg; 0,4 s fressen + 0,6 s Zauber) → clones[k] leuchtende Doppelgänger (höchstens 4 zugleich)
    //   springen herab (Landemarke) und stürmen ihre Bahn (lanes [[von, bis], …]; ohne: vor die Figur, dann auf sie zu);
    //   Wegstücke (breaks), auf denen sie landen/laufen, zerbröckeln nach 0,6 s Wackeln. Ende am end-Kasten (er springt davon).
    { type: 'spiegel', id: 'oben', trigger, route, follow: 'weg', ahead: 6, every: 3.0, fire, fruits: [[x, y, z], …],
      clones: [2, 3, 4], lanes: [[[x, y, z], [x, y, z]], …], breaks: ['steg1', …], cloneSpeed: 4.5, end: { min, max }, banner, rain },
    // Gipfel: Super-POW-Block (Motor), darauf der Baron und das Glas der Freunde. Angriffe von oben je Phase (Phase = 5 − hp):
    //   fire[Ph] Feuerbälle im Bogen (Landemarken), shock[Ph] Sprung-Schockwellen um den Block (Radius shockR, drüberspringen),
    //   clones[Ph] Doppelgänger (jagen cloneLife s); Pause every[Ph]. Jeder Stoß gegen den Block (Signal powSignal ??
    //   'super_pow') schleudert ihn hoch, er taumelt (STUN 1,4 s), hp − 1. Nach dem letzten: er fliegt davon (flyTo), das Glas
    //   fällt mit dem Block und zerspringt, die Freunde jubeln → Archetyp: Glasröhre (warp), Aktion onWin (Standard
    //   { credits: true }), Signal finaleWon.
    { type: 'gipfel', id: 'gipfel', trigger, center: [0, 32, -270], size: [25, 25],
      pow: 'superpow' | { id: 'superpow', pos: [0, 34.6, -271], size: 4.5, hits: 4 }, powSignal: 'super_pow',
      perch: [0.18 · size, 0] (Platz auf dem Block, relativ zur Mitte), glass: [−0.24 · size, −0.06 · size], friends,
      every: [2.8, 2.4, 2.1, 1.8], fire: [1, 2, 3, 3], shock: [0, 1, 1, 2], shockR: 11, clones: [0, 0, 2, 3], cloneLife: 6,
      flight: 1.1, flyTo: [x + 26, y + 16, z − 30], onWin: { credits: true }, banner, rain },
  ] }],
segments: [{ type: 'super_pow_block', id: 'superpow', pos: [0, 34.6, -271], size: 4.5, hits: 4 }],   // empfohlen
boss: { id: 'baron', name: 'Baron Brummbär', speed: 0, trigger (= trigger des ersten Abschnitts), warp: 'glasroehre',
        warpPos, warpTo, frame: 0.2, center, warpBanner: 'Ab in die Glasröhre!', musicAfter }   // bzw. Eintrag in LEVEL.bosses
```

- **Super-POW-Block**: steht er in den Level-Daten (empfohlen, `pow: 'id'`), liest der Baron Lage und Kante aus seiner
  Kollision (ein versteckter Block mit `hidden: true` braucht `pow: { id, pos, size }`). Fehlt er, legt der Baron ihn als
  Motor-Baustein an (`level.spawn('super_pow_block', …)`), ohne Motor als Rückfall `baron_superpow` (gleiche Schnittstelle).
  `onDone` des Blocks bleibt frei (z. B. Münzen); der Sieg läuft über `onWin` des Barons.
- **Tod im Kampf** (Archetyp `resetFight` → `reset`): nur der aktuelle Abschnitt beginnt von vorn (Wand-/Wegstücke, Früchte,
  Sperre zurück; Feuerbälle, Doppelgänger, Wellen, Marken weg); geschaffte Abschnitte bleiben geschafft. **Gipfel**: der
  Motor-Block hat kein `reset()` – die Stöße bleiben, der Baron beginnt mit `hp = 4 − Stöße` (Checkpoint-fair). Betritt eine
  Figur den Auslöser wieder, beginnt der Abschnitt erneut (Auftritt, dann Angriffe).
- **Treffer**: Draufspringen = Abprall ohne Schaden (`bounce`); Feuer, Krallen, Panzer, Stern, Riese prallen ab (Funken);
  Wurfsichel: Zucken + „Kratzer!“. Berührung im Kampf verletzt (außer im Wurf, Abflug, Sieg).
- **Lavabrocken-Regen** als Boss-Angriff: Abschnittsfeld `rain: 'id' | ['id', …]` – Motor-Bausteine `lavabrocken_regen` mit
  `targets` und `start: 'signal'` laufen ab dem Auftritt des Barons im Abschnitt (`start()`) und hören mit Abschnittsende, Tod
  oder Sieg auf (`stop()`).
- **Zustände**: wait | intro (2 s) | climb | fire | swipe | slidewarn | slide | slideup | eat | clone | guard | thrown | leave |
  between | perch | hop | summon | launched | stunned | defeated | flyaway | gone. Laufzeit `section`, `cur`, `done`, `phase`,
  `hp`, `fireballs`, `swipes`, `wallsBroken`, `slides`, `clonesMade`, `clones`, `powHit`, `powHits`, `wavesN`, `hits`, `hitLog`,
  `bounces`, `flinches`, `glassState` { shake, break, cheer }, `powTop()`, `info()`.
- Doppelgänger `baron_klon` (nur vom Baron erzeugt): `state` (pop | jump | run | burst), `by`. Rückfall-Block `baron_superpow`:
  `{ kind: 'baron_superpow', id, pos, size: 4.5, hits: 4, cool: 0.6 }` mit hits, left, done, state, top, hit(via), reset(), info().

### Präzisierung (Gegner Welt 8): Signale

| Signal | Daten | wann |
| --- | --- | --- |
| `sandfigurKaputt` | { id, kind, by, pos } | Sandstatue/-skulptur zerbröselt |
| `knochenGruppe` | { id, count, pos } | letzter Flieger einer Gruppe endgültig besiegt (dazu Aktion `onAll`) |
| `schubserFall` | { id, group, by ('fall' \| 'lava' \| 'wasser' \| 'besiegt'), pos, left } | je besiegtem Schubser |
| `schubserGruppe` | { group, count } | letzter Schubser einer Gruppe besiegt (dazu Aktion `onGroup`) |
| `bruchstueckKaputt` | { id, by, pos } | Wand-/Wegstück bricht |
| `baronPow` (bzw. `signal`) | { section, pos, pow } | POW-Block am Turm getroffen, Baron weggeschleudert |
| `baronAbschnitt` | { section, type, index } | Abschnitt geschafft |
| `freundeFrei` | {} | Glas zerspringt |
| `finaleWon` | { pos, friends } | Sieg (nach dem Abflug); dazu Aktion `onWin` (Standard `{ credits: true }`) |
| `aufschlag` (gesendet) | { pos, radius, by } | Landungen/Wellen/Pfützen/Bruchstücke (Leuchtstege) |
| `super_pow` (empfangen) | { hit, of, left, done, pos, source, via, id } | Stoß gegen den Gipfel-Block |

### Präzisierung (Gegner Welt 8): Hinweise für Level-Bauer

- **8-1 Regenfestung**: Knochenflieger-Gruppen 4–5 m über dem Weg (`pos.y` = Flughöhe), `sight` ≤ 7, `respawn: 4`; eine Kette
  (`linie`) über einer Brücke wirkt wie eine Welle von Angriffen – zwischen zwei Gruppen ≥ 8 m Platz lassen. Wer sie für
  immer loswerden soll: Power-up (Feuer-Werfer `feuer_werfer` in der Nähe) oder `respawn: false`. Stern als `onAll: { star: i }`.
- **8-2 Wüsten-Abfahrt (ride)**: Sandflosser auf das Dünennetz legen (`pos.y` egal, er liest `level.river.sample`); quer zur
  Fahrtrichtung pendeln lassen (`dir` quer, `dist` ≤ Bahnbreite), `every` ≥ 3, zielende (`aim`) sparsam – die Schattenmarke
  erscheint `warn` s vorher an der Landestelle. Stern 1: `star: 0` an einem pendelnden Fisch; Sandstatuen/-skulpturen in die
  Fahrspur (Pflaume zerstört sie im Vorbeireiten), Statue mit `star`, Skulptur mit `minis`; Flatterkäfer mit `star` über der
  Fahrspur (Höhe ≤ 2,5 m über der Düne, damit ein Sprung ihn erreicht).
- **8-3 Keksfabrik**: `ameisen_reihe` von Loch zu Loch (Löcher selbst begehbar bauen; `holes: false` ohne Krater), 1–2 Reihen,
  `every` ≥ 2,2; Riesenschnappblume braucht 3 Treffer (Wurfsichel = 1).
- **8-Zug**: Hackvogel/Mini-Pilzlinge unverändert (`pilzling` mit `mini: true`); Schattenläuferin 2 mit `round: 2` in einem
  Rundkäfig wie 3-Zug (r ≈ 9), `LEVEL.boss` wie im ersten Kampf.
- **8-4 Nachtfestung**: alle Aufschläge der Welt-8-Gegner lassen Leuchtstege aufleuchten (Signal `aufschlag`); Knochenflieger-
  Sturzflüge über Stegen sind fair, wenn der Steg darunter mindestens 2 m breit ist.
- **8-6 Spukhaus**: Kreisgeister in Ringen bis 40 (44 = z. B. 4 × 11); Großspuk-Jäger mit `hunt: true` und `trigger` am Beginn
  der Türreihe, `giveUp` setzen, wenn er nicht durchs ganze Level folgen soll; Licht-Helm besiegt ihn nach 2,2 s Licht.
- **8-A / 8-B**: goldene Würfelblase wie 6-C (`color: 'gold'`), rosa Schlangenkönig wie 3-B (`color: 'rosa'`; Manege mit Tellern –
  auf Tellern entstehen keine Pfützen). Für den Lavabrocken-Regen außerhalb der Arena den Motor-Baustein nehmen.
- **8-Burg**: Riesenrad (Motor) mit 4 Schubsern auf Gondeln (`group: 'riesenrad'`, `fallDefeat: 1.6`, pos = Gondel-Oberkante
  zum Startwinkel: x = Achse + R·cos a, y = Achse + R·sin a − 1,2 + 0,3; Gondel i bei a = angle + i·2π/n), Stern 2 per
  `onGroup: { star: 2 }`. Turm: Abschnitte wie `0-33` (Turm unten mit Kletterrinne und Wandstücken, POW-Block oben mit
  Sperre vor der Kanonen-Glasröhre; oberer Turm mit zwei Spiegelfrüchten, Brücken aus je zwei Wegstücken nebeneinander,
  Sturm-Bahnen auf je einer Seite; Gipfel ≈ 25 × 25 m, Block 2,6 m über dem Boden – Kopfstoß von unten reicht). Checkpoint am
  Beginn jedes Abschnitts (Tod setzt nur den Abschnitt zurück). Sieg: `onWin` Standard `{ credits: true }` (bzw. `LEVEL.credits =
  true`); Glasröhre `{ kind: 'warpbox', id: 'glasroehre', hidden: true }` als `boss.warp`. Gipfel-Kamera: Segment mit
  `pitch: 30, dist: 20, height: 6.5, xLock` (siehe 0-33), damit Block, Baron und Glas im Bild bleiben.

### Präzisierung (Gegner Welt 8): Tests und Kennzahlen

`tests/course_w8_enemies.mjs` (Port 4790; `W8E_PART=1` Sandflosser, Knochenflieger, Sandfiguren, Flatterkäfer · `2` Geister,
Ameisen, Schubser (Plattformen und Riesenrad), Bestand, Bruchstück, Schockwelle, Lavapfütze, Wurfsichel bei allen neuen Arten ·
`3` Varianten und Baron (Turm, Spiegel, Gipfel, Tod/Neustart, Abspann-Anforderung) · `4` Bilder `tests/out/w8e_*.png` und
Zeichenaufrufe; jeder Teil < 10 min, deterministisch über `window.__course`). Stand: Teil 1 24/24, Teil 2 18/18, Teil 3 34/34,
Teil 4 10/10. Kennzahlen: Gegnerzoo höchstens ≈ 60 Zeichenaufrufe, Massen-Feld (44 Kreisgeister, 24 Knochenflieger) ≈ 39
(< 120), Bossarenen höchstens ≈ 91 (< 140), höchstens ≈ 265 k Dreiecke; Schritt im Gegnerzoo (159 Entitäten) ≈ 0,2–0,4 ms.

## Bonuswelten – Level-Liste und Freischaltung (Hauptsitzung)

Nach dem Finale (`8-Burg`, Spielstand `finished`) folgen vier Bonuswelten. Sie sind **Sonderwelten mit Buchstaben-Präfix**
(wie die Halloween-Welt, `MAP.prefix`): Level-Ordner `src/course/levels/w<Welt>/`, Kartendatei
`src/course/map/worlds/w<Welt>.js`. Pilz und Blume sind **Remixe** vorhandener Level (Basislevel + Remix-Regeln, siehe
„Remix-Level“ unten), Stern bringt neue Level, Krone ist die Abschlussprüfung. Pilz- und Blumen-Level haben **keinen
Stempel**. Sterne in der Schranke zählen immer **alle** gesammelten Sterne (Welt 1–8: 249, Halloween 18 → 267 vor den
Bonuswelten).

| Welt | Nr. | Präfix | Name | Karte frei nach | Musik Karte |
| --- | --- | --- | --- | --- | --- |
| Stern | 9 | `S` | „Sternenzelt“ (Weltraum, Regenbogenwege, Planetoiden) | Sieg in `8-Burg` (Röhre `WS` auf der Welt-8-Karte) | `course_worldstar_map` |
| Pilz | 10 | `P` | „Pilz-Remix“ (bekannte Orte, neu gemischt) | `S-8` | `course_worldpilz_map` |
| Blume | 11 | `B` | „Blumen-Remix“ | `P-6` | `course_worldblume_map` |
| Krone | 12 | `K` | „Kronen-Gipfel“ (Abschlussprüfung) | `B-12` **und ≥ 330 Sterne** | `course_worldkrone_map` |

### Welt Stern (9)

| Id | Archetyp | Inhalt | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `S-1` | parcours | Regenbogen-Plattformen mit Hüpfmäusen, Trapeze, Reitfahrt auf schwimmendem Reittier, Fackelplatz, Riesentrank, P-Schalter-Münzregen | course_rainbow | 3 + Stempel | Welt offen |
| `S-2` | parcours | Planetoiden-Hommage: kippende Drehplatten, Plattenbahnen, Boost-Strecke, Plattentreppe, Schachbrett; Abschluss schaltet das **Sternenglanz-Kostüm** für Lotti und Greta frei | course_galaxy | 3 + Stempel | S-1 |
| `S-Kapitän` | diorama | mechanisches Diorama, per Schalter drehbar (Drehen ist Pflicht), Stern 4 nur mit gedrehter Kamera; 9 Funkenflämmchen | course_diorama | 5 | S-2 |
| `S-3` | parcours | Holz-Athletik mit rollenden Schienenwalzen, Walzentrio, Walzenaufstieg, große Walze mit Seitenweg | course_rollingride | 3 + Stempel | S-2 |
| `S-4` | verfolgung | der Zielmast bekommt Flügel und fliegt davon (wartet, wenn man zurückfällt), Boost-Pfeile, Glotzfische, Donut-Felder; 100 s ohne Zeitboni | course_goalpole | 3 + Stempel | S-3 |
| `S-5` | parcours | Retro-Blockland aus Riesenblöcken: Grasinseln, Laufbomben, Gleitblätter, wachsende Riesen-?-Türme, Felsblock sprengen, 5 Schlüsselmünzen | course_blockland | 3 + Stempel | S-4 |
| `S-6` | parcours (Draufsicht) | Kamera senkrecht von oben, Waben-Plattformen aus Lava/Eis, Wurfsichel, Spiegelfrucht, Käferfeld, Brummer, Zielturm | course_honeycomb | 3 + Stempel | S-5 |
| `S-7` | parcours | Dschungel, alles übergroß: Riesen-Pilzlingstürme, Großrollpilze, Riesentrank-Feld, Unterwasser mit Strömungen | course_grotto | 3 + Stempel | S-6 |
| `S-8` | parcours (Geister) | verschneiter Spukfriedhof im Nebel, 5 Schlüsselmünzen, Floßfahrt über Giftsumpf, auf- und absteigende Nebelplattformen | course_fogbog | 3 + Stempel | S-7 |
| `S-9` | parcours | futuristischer Weltraum mit Kanonen-Helm: Schienenbrett-Fahrt, Kanonenkugel-Wand, Unterwassertunnel, Weichen umschießen | course_cosmic | 3 + Stempel | S-8 **und ≥ 280 Sterne** |

Welt Stern hat 32 Sterne.

### Welt Pilz (10) – Remix-Welt 1 (ohne Stempel)

| Id | Basis | Remix-Regeln (Kurzfassung, Details im Bauplan) | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `P-1` | `2-4` | Nacht, kürzer, 30 s, Zeit-Uhren als Ideallinie, Stachel-Hüpfmäuse, Stachelkugler | Basis, Variante `nacht` | 3 | Welt offen |
| `P-2` | `1-3` | Sonnenuntergang, Stachelkugler, Walzenwerfer, 3 Glockenbäume statt Gipfelbrücke, 5 Schlüsselmünzen, 500 s | Basis, Variante `abend` | 3 | P-1 |
| `P-3` | `6-4` | stockdunkel, 4 Licht-Helme, Floß mit Spuken/Großspuken/Kreisgeistern | Basis, Variante `dunkel` | 3 | P-2 |
| `P-4` | `2-3` | nur der Schatten-Abschnitt, 100 s, dicht mit Gegnern, Pilzlingsturm aus 30 Pilzlingen | Basis, Variante `schnell` | 3 | P-3 |
| `P-5` | `6-3` | Tag, Werfer, Wurfbälle, 5 Schlüsselmünzen, pendelnd fliegender Zielmast | Basis | 3 | P-4 |
| `P-Haus` | – | 10 Kampf-Räume à 10 s (je Raum alle Gegner besiegen) | course_house | 10 | P-4 |
| `P-6` | `6-2` | Riesen-Wracks, mehr Schubser/Pustewolken/Krakenpilze, 5 Warp-Boxen | Basis | 3 | P-5 |
| `P-7` | `7-4` | sinkende Plattformen über blauer Lava, Stachelwalzen, Gleitblatt | Basis, Variante `nacht` | 3 | P-6 **und ≥ 310 Sterne** |

Welt Pilz hat 31 Sterne.

### Welt Blume (11) – Remix-Welt 2 (ohne Stempel)

| Id | Basis | Remix-Regeln | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `B-1` | `1-5` | Funkenflämmchen auf den Schaltfeldern, Hammer-Werfer | Basis | 3 | Welt offen |
| `B-2` | `6-7` | schwebende Wasserwürfel statt Kippplattformen, zweite Wuschel-Horde | Basis | 3 | B-1 |
| `B-5` | `5-4` | Morgen, viele Hasen + Riesenhase, Wolkenlifte, 500 s | Basis, Variante `morgen` | 3 | B-1 |
| `B-3` | `4-2` | Nacht, 23 Fackeln in 3 Bereichen, schnellere Schiebeplattformen | Basis, Variante `nacht` | 3 | B-2 |
| `B-4` | `7-1` | Start mit 30 s, nur Zeit-Uhren verlängern | Basis, Variante `schnell` | 3 | B-3 |
| `B-6` | `3-3` | Schwarz-Weiß-Filter, Großspuk-Jagd, falsche Zielmasten | Basis, Variante `schwarzweiss` | 3 | B-4 |
| `B-7` | `3-5` | Kanonen-Helme unter Wasser, Felsblockwände | Basis | 3 | B-6 |
| `B-8` | `4-3` | Piep-Blöcke 4× schneller ohne Warnpiepen, Gleitblätter, viele Stacheln | Basis (Takt-Kopplung!) | 3 | B-7 |
| `B-9` | `5-1` | nur der Strand, Sonnenuntergang, 4 Pilzlingstürme mit Feuer-Werfern, 100 s + Zeit-Uhren | Basis, Variante `abend` | 3 | B-8 |
| `B-10` | `S-6` | Taghimmel statt Weltraum, schwerer | Basis, Variante `tag` | 3 | B-9 |
| `B-11` | `8-1` (+ `5-7`) | Suchscheinwerfer über den Brücken: im Licht fahren Stacheln aus | Basis, Variante `nacht` | 3 | B-10 |
| `B-12` | – | Boss-Marathon im Weltraum bei Nacht: Hub mit 6 Warp-Boxen, 5 Bosse geben je einen Schlüssel, dann Würfelblase | course_bossblitz | 3 | B-11 |

Welt Blume hat 36 Sterne.

### Welt Krone (12) – Abschlussprüfung

| Id | Archetyp | Inhalt | Musik | Sterne | frei nach |
| --- | --- | --- | --- | --- | --- |
| `K-Kapitän` | diorama | Lavaturm-Diorama 30 × 30 × 25 m, steigende/sinkende Lava | course_diorama | 5 + Stempel | Welt offen |
| `K-Haus` | house | 30 Räume à 10 s am Stück | course_house | 30 | Welt offen |
| `K-1` | parcours (extrem) | ≈ 900 m ohne Checkpoint und Power-ups, 4 Warp-Boxen, fast alle Gimmicks des Spiels hintereinander | course_champion | 3 + Stempel | **vollständige Sammlung**: alle Sterne und Stempel aller anderen Welten |

Welt Krone hat 38 Sterne; das ganze Spiel hat damit 404 Sterne.

### Remix-Level (Vertrag für Motor-, Musik- und Level-Agenten)

- Ein Remix-Level ist eine eigene Level-Datei (`src/course/levels/w10/P-1.js` …), die das Basislevel **als Daten** übernimmt
  und Regeln anwendet, statt es zu kopieren (Remix-Helfer des Motors, z. B. `remixOf('2-4', { … })`). Änderungen am
  Basislevel wirken so automatisch mit; was ein Remix entfernt, ersetzt oder neu setzt, steht in der Remix-Datei.
- Musik: Remix-Level spielen die Musik des Basislevels mit einer **Klang-Variante** des Musiksystems
  (`nacht`, `abend`, `morgen`, `tag`, `dunkel`, `schnell`, `schwarzweiss`): andere Klangfarbe/Filter/Hall bzw. leicht
  schnelleres Tempo, dieselbe Komposition. Ohne Variante klingt sie wie im Basislevel.

## Präzisierung (Level 8-Haus, 8-6 und 8-7)

Additiv zur Welt-8-Liste: Titel und Besonderheiten der Level 8-Haus, 8-6 und 8-7. Dateien `src/course/levels/w8/8-Haus.js`,
`8-6.js`, `8-7.js`, eigene Hilfen `src/course/levels/w8/_helpers_c.js` (kein `LEVEL`, nur für diese drei Level; reicht
`isl`, `line`, `ring`, `blk`, `cyl`, `sph`, `cone`, `bakeParts`, `glowPoints`, `hausRaum`, `hausFertig`, `raumHaken`, `wimpel`,
`levelSetup`, `cullStatic`, `farHide`, `heroShadowDiet`, `lavaFaelle`, `funkenFlug`, `glutSaum` aus `w4/_helpers_d.js` weiter),
Test `tests/course_w8c.mjs`. **Kein Motor-Code geändert**; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.build`/`LEVEL.setup`). Bausteine nach „Präzisierung (Motor und Bausteine Welt 8)“, Gegner nach „Präzisierung (Gegner
Welt 8)“.

### 8-Haus „Haus Krallenkraxel“ (house · house · course_house · 10 Räume à 10 s, 10 Sterne)

- Zehn Räume (Raster 64 m nach −Z, Boden y 1), jeder mit eigener Tapete und Holzfarbe (Bauklötze, Pilze, Kirmes, Maschine,
  Sternenhimmel, Dachboden, Schaukel, Kanone, Zirkus, Kugeln), Wimpelketten, Bilderrahmen und Raumtitel. `fail: 'exit'`: wer
  die 10 s überzieht, verlässt das Haus, die Sterne bis dahin bleiben gespeichert. Die Figur trägt in jedem Raum den
  **Krallen-Anzug** (`krallenHaus`: beim Einblenden jedes Raums, nach Verlust nach 1,2 s neu). Kletterwände aus `kraxelBlock`
  (bunte Griffe auf farbigen Bauklotz-, Fels-, Turm- oder Holzflächen); **glatte Flächen** (`look: 'glatt'`, `noWallSlide`,
  Glanzstreifen) halten nicht – so ist der Weg jeder Wand lesbar.
- Räume: **1 Bauklotzturm** – Turm mitten im Raum hinauf und hinüber, der Stern liegt **unten** in der Grube hinter dem Turm
  (Schild „Stern unten ↓“); oben auf dem Turm ein **Druckschalter** (draufspringen → Münzring aus 8 Münzen, 6 s) ·
  **2 Kristallhöhle** – zwei Felsstufen (y +6, +12) · **3 Piep-Wand** – rote Piep-Blöcke unten, blaue oben; nur die gerade
  festen sind kletterbar (rot hinauf, auf den Takt warten, blau weiter) · **4 Glutwand** – Lavagraben vor der Wand, drei
  **Lavarinnen** laufen die Wand hinab, in den Gassen dazwischen klettern · **5 Leuchtturm** – zwei Turmstufen (y +7, +14),
  Stern oben · **6 Ziegelsperre** – 30 Ziegel (5 × 6) vor der Wand, Seiten glatt; mit dem **Tatzenhieb** (Aktion) eine Gasse
  schlagen, dann klettern · **7 Doppelwand** – Wand A hinauf, über den glatten Sockel hinüber, Wand B (y +15) hinauf ·
  **8 Lavaquerung** – zwei Basaltsäulen (y +4,5 / +9) im Lavasee, dann die Zielplattform (Kamera steil, 52°) ·
  **9 POW-Wand** – die Kletterspalte ist mit 45 Ziegeln (5 × 9) zu; der **POW-Block** (2 Stöße, Radius 9, Höhe 10) zerschlägt
  sie, drei Pilzlinge laufen herum · **10 Bröckelturm** – 8 **Bröckel-Bauklötze** (`bruchstueck`, 2 Spalten × 4 Reihen,
  kletterbar, Warnzeit 0,75 s) bröckeln los, sobald man daran hängt; oben eine feste Kante mit dem Stern.
- Gegner: Pilzling 3. Leistung: `heroShadowDiet`, Gegner/Sterne/Ziegel über 48 m aus (`farHide`).

### 8-6 „Finsterfahrt im Spiegelspukhaus“ (parcours · darkghost · course_beamdark · 400 s)

- ≈ 200 m nach −Z, Erdgeschoss y 1, Obergeschoss y 15, **stockdunkel** (Licht nur aus Licht-Helm, Kerzen, Kronleuchtern,
  Laternen). **Helmhalle** (Start, Regal mit 4 **Licht-Helmen**, `respawn` 3 s) → **runde Aufzugplattform 1** (`mover`
  `shape: 'cyl'`, r 2,4; fährt erst, wenn eine Figur daraufsteht; ≈ 52 m durchs Dunkel über Kerzen-Inseln): drei
  Kreisgeist-Ringe (je 8), Spuke, Knochenflieger; der **POW-Block** fährt mit (`mitfahren`) und lässt alle kleinen Geister
  im Umkreis 9 m verschwinden (`geisterSchreck`) → **Spiegelsaal**: **Großspuk 1** hält die Saaltür (`spuk_tuer`
  `key: 'grossspuk1'`) – mit Licht besiegen; **großer Spiegel** (`grosser_spiegel`, 3,6 × 5 m) → **Aufzugplattform 2**
  (≈ 52 m) mit **rotem Ring** (8 rote Münzen in 12 s → Extraleben) und zwei Ringen à 6 → **Checkpoint-Raum** mit
  Statuenschacht: **Schnell-Aufzug** `steig` (y 0,75 → 14,5, 5 m/s, Pendel mit 1,4 s Pause) zwischen Baron-Statuen →
  Obergeschoss-**Türreihe** (vier Spuktüren, dazwischen je ein kreisender Geist – Lücke abwarten) → hinter der letzten Tür
  erwacht **Großspuk 2** als Jäger (`hunt`, `trigger`, `huntSpeed` 2,4, `giveUp` 30) und jagt zur Ausgangstür → Balkon,
  **Sprung auf den Zielturm** mit Zielmast.
- Sterne: 0 **Spiegelbild-Stern** – im Saal unsichtbar (nur auf der Spiegel-Ebene), der Spiegel zeigt ihn über zwei
  unsichtbaren Stufen (`parts`); im Spiegel nachsehen, die Stufen hinauf, hochspringen · 1 **Rätselbox** (versteckte
  Warp-Box oben am Schnell-Aufzug, nur im Sprung von der fahrenden Plattform) → Spukzimmer mit **6 Spuken**: alle mit Licht
  besiegen (`task`) · 2 **am Ende des letzten Gangs** vor dem Jäger-Großspuk (holen, Großspuk mit Licht bannen oder
  weglaufen). Stempel: **Figurenschalter für Greta** in der Helmhalle → rosa Leuchttreppe (`leuchtsteg`) zur Empore.
  Geheimnisse: unsichtbarer Block mit Extraleben im Spukzimmer, ?-Block mit 5 Münzen im Checkpoint-Raum, roter Ring.
- Gegner: Spuk 10 (+ 2 Großspuke), Kreisgeist 44 (5 Ringe mit 36 Gliedern, 8 einzelne), Knochenflieger 10 (Schatten nur bis
  10 m, über 30 m aus).

### 8-7 „Kullerklotz-Ritt durchs Glutinferno“ (parcours · inferno · course_inferno · 400 s)

- ≈ 360 m nach −Z über vier Lavastufen (y −0,7 / −3,7 / −6,7 / −14,7). **Rastplatz** (Start, ?-Block mit Wachstumsbeere) →
  **Felsklotz 1** (`kristall_felsklotz`, 3,6 m; Schlangenlinie, Stampfen gibt Schub) → Plateau → **Würfel-Felsklotz**
  (3,2 m) mit **zwei 3-m-Abstürzen** → **Festland** (z −128 … −182, y −6) mit Checkpoint, drei **Hammer-Werfern** (einer
  auf einer Basaltsäule), Sechseck-Basaltpflaster mit Glutfugen, Glutlilien, Schwefelschloten → **Felsklotz 3** den
  **Lavahang** hinab (schräge Lavafläche mit Stufen-Todeszonen und Böschungen, `lavaHang`) → Plateau 3 mit Checkpoint und
  Sternenring → **Felsklotz 4** (3,8 m) auf der **langen Kurvenroute** (S-Kurven unter Kristallbögen) → Zielinsel.
- Sterne: 0 auf einer **Kristall-Insel in der Lava** während der Würfelfahrt (abspringen; der kleine **Stern-Klotz**
  bringt zurück zum Festland) · 1 **Sternenring** auf Plateau 3 (8 Sternmünzen auf Kristallsäulen; versteckter Stern) ·
  2 auf der letzten Fahrt unter dem **Kristallbogen hochspringen**. Stempel: nach dem Checkpoint über einen Absatz auf die
  **Basaltsäule des Hammer-Werfers**, ihn besiegen, von oben zum Stempel springen (vom Boden zu hoch). Geheimnisse:
  unsichtbare Blöcke mit Extraleben am Rastplatz und am Festland-Ende.
- Gegner: Hammer-Werfer 3 (`feuer_werfer`-Art), Lavablase 10, Knochenflieger 2. Zier: Kristalle (lila, blau, rosa, gold),
  Basalt-Säulengruppen, Lavafälle, Glutsaum, Funkenflug, Dampf, Bims-Enten; Fahrkameras flach (Neigung 34–40°).

### Hilfen `_helpers_c.js`

Allgemein: `TAU`, `clamp`, `arc` (Münzbogen), `coinsAt`, `sign` · 8-7: `kristalle`, `basalt`, `lavaHang`, `kristallBogen` ·
8-6: `aufzugStart` (Mover fährt los, wenn eine Figur daraufsteht; Neustart setzt zurück), `mitfahren` (Gegner/Block folgt
einem Mover), `geisterSchreck` (POW-`onUse`), `aufzugSchmuck`, `kerzenInseln`, `helmRegal` · 8-Haus: `kraxelBlock`
(kletterbarer Quader mit bunten Griffen oder glatt), `krallenHaus` (Krallen-Anzug je Raum), `lavaRinnen`, `broeckelWand`
(Griffe an `bruchstueck`-Modellen; bröckeln nur beim Klettern).

### Test `tests/course_w8c.mjs`

Port 4870 (+ `PORT_BASE`), Aufruf `node tests/course_w8c.mjs [8-Haus|8-6|8-7]`, Teilläufe
`PARTS=load,route,sweep,targets,extra,shots,haus,haus-extra` (je Lauf < 10 min; Parcours je `load,route,sweep`,
`load,targets,extra` und `shots`, Haus `load,haus`, `haus-extra`, `shots`), `HEROES`, `ONLY`, `VERBOSE`, `SHOTS`, Bilder
`tests/out/w8c_*.png`. Bot mit echter Eingabe; Beine u. a. `lift` (Aufzugfahrt mit Licht/POW), `steig`, `light`/`lightAll`
(Licht-Helm auf Geister richten), `gap` (Lücke kreisender Geister), `klotz` (Felsklotz-Fahrt mit Stampfen, Absprung,
Hochsprung), `warp`, `swipe`, `pound`. Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und
Greta Start → Ziel (8-6 ≈ 79/69 s ohne Treffer-Versuch, mit rotem Ring und Jagd; 8-7 ≈ 115/113 s, vier Felsklotz-Fahrten,
zwei Abstürze); 8-Haus alle 10 Räume mit beiden Figuren je 3,3–6 s ohne Treffer, Ergebnis 10/10 gespeichert; alle Sterne und
Stempel mit Gegenproben (Spiegelstern nur auf der Spiegel-Ebene, Spuke nur anschauen, Großspuk lauert vor der letzten Tür,
Stempel nicht mit Lotti, Würfel ohne Sprung, Säulen ohne Ring, Bogen ohne Sprung, Stempel vom Boden; Haus: ohne Krallen-Anzug
in Raum 2 und 5, rote Piep-Blöcke aus, Lavarinne tödlich, Ziegel ohne Tatzenhieb, Spalte ohne POW, Bröckeln, Zeitablauf →
Haus verlassen mit 2 von 10 Sternen); Extras (Aufzug ruht, Saaltür zu, Felsklotz ruht, drei Extraleben). Gemessen (scale 2,
inkl. Schattenpass): 8-Haus 37–82 Zeichenaufrufe (Raum 10 mit den Bröckel-Klötzen am meisten) / ≤ 153 k Dreiecke (Piep-Wand);
8-6 Messgang Ø 39, ≤ 70 Aufrufe / ≤ 101 k, Bilder 25–106 (der Spiegel zeichnet die Szene ein zweites Mal) / ≤ 135 k; 8-7
Messgang Ø 71, ≤ 94 / ≤ 113 k, Bilder 57–91 / ≤ 113 k.

## Präzisierung (Level 8-1, 8-2 und 8-3)

Additiv zur Welt-8-Liste: Titel und Besonderheiten der Level 8-1, 8-2 und 8-3. Dateien `src/course/levels/w8/8-1.js`, `8-2.js`,
`8-3.js`, eigene Hilfen `src/course/levels/w8/_helpers_a.js` (kein `LEVEL`, nur für diese drei Level; nutzt `isl`, `line`,
`ring`, `arc`, `column`, `sign` aus `w7/_helpers_a.js` und `Bld`, `litTop`, `gradY` aus `w5/_helpers_b.js`), Test
`tests/course_w8a.mjs`. **Kein Motor-Code geändert**; alles Besondere ist level-lokal (Haken `LEVEL.prebuild`/`build`/`setup`,
`level.onStep`, `view.onFrame`). Bausteine nach „Präzisierung (Motor und Bausteine Welt 8)“, Gegner nach „Präzisierung (Gegner
Welt 8)“.

### 8-1 „Stachelstege der Regenfestung“ (parcours · rainfort · course_rainfort · 400 s)

- Außenfestung im Dauerregen hoch über dem Burggraben (Laufhöhe y 1, Absturz unter y −8), ≈ 300 m nach −Z: **Torhof** (?-Block
  mit Krallen-Anzug, Münzblock) → zwei schmale **Stachelstege** (Stachelfallen im festen Takt, auf Steg 2 eine Welle aus drei),
  Knochenflieger-Ring und -Linie über den Turmplätzen → **Warp-Box** über den breiten Graben (Sprung unmöglich) →
  **Werferstege** (3-m-Lücken, drei Feuer-Werfer, der dritte mit Hammer) → Warp-Box zur **Kontrollpunkt-Insel** →
  **Knochenflieger-Strecke** (Linie, Keil aus 7, Ring aus 8; Draufspringen → Knochenhaufen, setzt sich nach 4 s neu zusammen;
  Stampfen auf den Haufen bzw. Power-up endgültig), Steg mit zwei Fallen → drei **Stachel-Schwebeplattformen** (`stachelblock`,
  zwei blaue mit Pause, eine rote ohne) → Warp-Box zum **Zielturm**.
- Sterne: 0 oben auf der **Kletter-Säule** links vom ersten Feuer-Werfer (nur mit dem Krallen-Anzug aus dem ?-Block am
  Ankunftsplatz; Münzsäule als Hinweis) · 1 **Wachstube**: mit dem Krallen-Anzug vom Kontrollpunkt die Wand hinter dem
  Stempel-Turm hinauf, oben die Rätselbox, in der Stube vier Wachen (2 Pilzlinge, 2 Krallen-Pilzlinge) besiegen (`task`) ·
  2 nach der Keil-Gruppe über vier **einzelne Fallblöcke** (`fallblock_bruecke`, `mode 'einzeln'`) hinaus. Stempel: auf dem
  Stempel-Turm südwestlich des Kontrollpunkts (Steg mit Stachelfalle 7).
- Extraleben: unsichtbarer Block am Torhof, unsichtbarer Block in der Wachstube. Gegner: Feuer-Werfer 3, Stachelfalle 7,
  Knochenflieger-Gruppen 5 (25 Glieder), Wachen 4.
- Level-lokal: `fallblockRuhig` (ein wackelnder Fallblock gibt beim Absprung keinen zufälligen Seitenschwung mehr mit – sonst
  gelang der Hüpfer zum nächsten Block nur manchmal; Wunsch an den Baustein). Kulisse `regenfestung81`: Ziegelfassaden,
  Bodenplatten, Brüstungen mit Zinnen (Kollision), bunte Rundtürme (auch fern im Graben), **rote Läufer** mit Goldborte über
  alle Plätze (`laeufer8`, zeigen den Weg), **Wappenschilde** an den Brüstungen, **Frösche** an den Pfützen, Wasserspeier an den
  Brüstungen (Strahl in eine Pfütze), Glühbirnen- und Wimpelketten, Fahnen, Fackeln, Regentonnen, dazu ein matter, dunkler
  **Burggraben** mit Regenringen um die Kamera (`graben8`; die glänzende Graben-Fläche des Themas spiegelte sonst hellen Himmel).

### 8-2 „Pflaumes Dünenrutsche“ (ride · dunes · course_dunes · 400 s)

- Ritt-Level wie 1-4, aber das Ritt-Netz (Baustein `river` Form A) ist **Sand**: `LEVEL.prebuild` → `duenenThema` (Kopie des
  Themas mit `jungle: SAND8`, die Fluss-Bausteine lesen die Farben beim Aufbau), `LEVEL.setup` → `sandAnsicht` (Strom-Fläche matt,
  Schaumstreifen als helle Sandschlieren, Spritzer als Sandfontänen, helle Spur), `sandDunst` (Nebel 40–160 m; statische
  Abschnitte, deren Quader > 106 m von der Kamera liegt, werden nicht gezeichnet – der lange Blick die Düne hinab), `sandStrom`,
  `stempelBlock`; `LEVEL.build` setzt unsichtbare Leitplanken um die Oase (zu Fuß nicht zurück in den Sandstrom).
- Abschnitte (≈ 29 m Gefälle): **Dünenkamm** (Sandstein-Plateau, Holzsteg unter einem Rummel-Torbogen, Buden, Ballons,
  Pflaume wartet im Sand) → **Startmulde** (breit, langsam 1,6–2,3 m/s) → **erste Abfahrt** (S-Kurven, Schubfelder,
  Pilzling-Sandskulpturen, Sandflosser; Kontrollpunkt z −105) → **Käferschlucht** (Schubfeld, Holzrampe) → **zweite Abfahrt**
  (bis 7,2 m/s; links zweigt der **Felsentor-Arm** ab und mündet wieder) → Kontrollpunkt z −217 → **Statuenfeld** (24 m breit,
  Baron-Sandstatuen mit im Sand versenktem Sockel – rammen zerbröselt sie, 2 Münzen) → **Oase** zu Fuß (Absteigen am Strand,
  Teich mit Palmen, Picknick, Torbogen, Zielmast).
- Sterne: 0 **Stern-Sandflosser** in der Startmulde (springt quer hin und her, rote Schattenmarke; im Sprung von oben treffen:
  kurz bevor er auftaucht hüpfen und beim Herausspringen auf ihm landen) · 1 **Flatterkäfer** links hinter der Rampe, 2,3 m über
  dem Sand (nur mit dem Rampensprung erreichbar: auf der Rampe springen bzw. Sprungtaste halten und in der Luft nach links
  lenken; der gerade Rampensprung fliegt vorbei; drei hohe Münzen zeigen hin) · 2 **große Baron-Sandstatue** rechts (lat 7, eine
  Münzreihe führt hin) kurz vor dem Ende: zerbröselt,
  der Stern erscheint 2,5 m stromab. **Sterne im Sandstrom treiben mit** (`sandStrom`): wer daneben landet, holt den Stern mit
  Bremsen/Lenken ein; der vom Käfer losgelassene Stern fällt bis auf die Sandoberfläche. Stempel: in der Oase vier **unsichtbare
  Wolken** (`wolkenlift`, `reveal 'touch'`, ohne Pfad) zwischen drei Baron-Statuen, je eine Münze darüber als Hinweis; über der
  obersten der **?-Block** – Kopfstoß, der Stempel steigt auf den Block (`stempelBlock`), hinaufspringen.
- Extraleben: unter dem Sandsteinbogen im Felsentor-Arm (schwebt), unsichtbarer Block in der Oase. Figuren: Sandflosser 10
  (Stern, quer pendelnd, zielend, Kreis), Flatterkäfer 1, Pilzling-Sandskulptur 6 (rammen → 3 Münzen), Baron-Sandstatue 10
  (7 im Strom, 3 in der Oase), Schubfeld 5, Rampe 1, Kontrollpunkt 2.
- Kulisse: Palmen, Kakteen, Ruinen und Blüten auf den Dünenkämmen, Wimpelketten quer über den Strom, Dünen und Pyramiden auf der
  Tiefebene, Tafelberge, Schmetterlinge. Leistung: `farHide` 48, `instances` (Statuen 46 m / Schatten 10 m, Skulpturen und
  Flosser 46 / 20, Münzen ohne Schatten), Kulissen ohne Schatten.

### 8-3 „Keksräder in der Zuckerfabrik“ (parcours · cookie · course_cookie · 400 s)

- Baron Brummbärs Keksfabrik (Boden y 1, Ameisenstraße oben y 16, Absturz unter y −8): **Keksräder** (zwei Drehkekse,
  Riesenschnappblume 1, zwei ineinandergreifende Keks-Zahnräder, Riesenschnappblume 2, stehende Laufkekse wie Förderbänder) →
  **Zahnradwand** 15 m hoch (Paternoster-Zahnrad `axis 'z'` und vier liegende Zahnrad-Stufen, Zier-Zahnräder; Kamera ab z −76
  flacher) → **Ameisenstraße** (Kontrollpunkt, vier Hörner-Ameisen-Reihen von Loch zu Loch, zwei davon mit zwei Spuren im
  Gleichtakt `phase 0`; die Löcher sind begehbar) → **Kanonen-Glasröhre** zur Zielplattform.
- Sterne: 0 hinter Riesenschnappblume 2 über zwei kleine Kekse, dann eine 6,2-m-Lücke mit dem Stern (Weitsprung vom zweiten
  Keks oder Wurfsichel aus dem ?-Block am Start; ein normaler Sprung ist zu kurz), Landekeks und Zuckerguss-Steg zurück ·
  1 Loch der dritten Ameisen-Reihe → Fach mit der Rätselbox → Keks-Raum: großer Drehkeks über dem Schokoladensee · 2 hinter dem
  Zielmast hinab auf die entfernte **Kuchenplattform** (Sahnerand hält Hase und Heldin), Hasen fangen, Röhre zurück. Stempel:
  im Fach unter der ersten Ameisen-Reihe (Röhre zurück auf die Straße).
- Extraleben: unsichtbare Blöcke im Stempel-Fach und im Keks-Raum; Wurfsichel am Start, Wachstumsbeere am Kontrollpunkt.
  Gegner: Riesenschnappblume 2, Hörner-Ameisen-Reihen 4, Hase 1.
- Kulisse `zuckerwerk83`: bunte Streusel auf allen Plätzen, Zuckerguss-Wülste mit Tropfen an den Kanten, Lollis, Zuckerstangen,
  Cupcakes, Macarons, Gummidrops, Bonbons, Schoko-Tropfen und Zuckerguss-Wellen an der Zahnradwand, Torte (Schichten an den
  Seiten, Sahnetupfer, Erdbeeren, Kerzen mit Flamme), glänzender Schokoladensee mit Milchschlieren tief unter Fabrik, Torte
  und Keks-Raum (knapp über der Absturz-Ebene).

### Hilfen `_helpers_a.js`

Daten: `isl`, `line`, `ring`, `arc`, `column`, `sign`, `falle` · Mechanik: `fallblockRuhig` (8-1), `sandStrom`, `stempelBlock`
(8-2) · Darstellung: `duenenThema` + `SAND8`, `sandAnsicht`, `sandDunst` (8-2) · Kulisse: `RF`, `ziegel8`, `fassaden8`,
`platten8`, `bruestung8`, `turm8`, `stegRand8`, `laeufer8`, `frosch8`, `wappen8`, `graben8`, `regenfestung81` (8-1),
`zuckerwerk83` (8-3).

### Test `tests/course_w8a.mjs`

Port 4850 (+ `PORT_BASE`), Aufruf `node tests/course_w8a.mjs [8-1|8-2|8-3]`, Teilläufe `PARTS=load,route,sweep,targets,extra,
shots` (je Lauf < 10 min: `load,route,sweep`, `targets`, `extra,shots` getrennt), `HEROES`, `ONLY`, `VERBOSE`, `TRACE`, `SHOTS`,
`DETAIL`, Bilder `tests/out/w8a_*.png`. Bot mit echter Eingabe (`setInput`/`step`, Stick relativ zur Kamera-Gier); Beine u. a.
`trap` (Stachelfalle abwarten), `block` (Stachel-Schwebeplattform), `grab` (Power-up aus dem ?-Block), `climb` (Krallen-Anzug),
`warp`, `stompAll`, `diveStomp` (Knochenflieger im Sturzflug), `gear`/`cog` (Zahnräder), `ants` (Ameisen-Reihe queren bzw. ins
Loch), `long` (Weitsprung), `throwAt` (Wurfsichel), `upOnto` (neben einem Block hoch, erst über der Kante hinüber), `die`
(Sturz, Neustart abwarten) und für den Ritt `mount`, `pflaume` (Autopilot mit Seitenlage je z), `flosser` (nächste Auftauchstelle
vorausberechnen, Längstempo anpassen, rechtzeitig hüpfen), `kaefer` (Rampe auf Seitenlage, springen, in der Luft lenken),
`rideStar` (treibenden Stern einholen). Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti und Greta
Start → Ziel (8-1 ≈ 62 s mit drei Warp-Boxen, drei besiegten Werfern, drei Schwebeplattformen; 8-2 ≈ 65/64 s ohne Treffer,
Statue gerammt, fünf Schubfelder; 8-3 ≈ 42/39 s ohne Treffer, Paternoster, Zahnrad-Stufen, Ameisen-Reihen, Kanonenröhre); alle
Sterne und Stempel mit Gegenproben (Säule ohne Anzug, Rätselbox ohne Wachen, Mulde ohne Hüpfer, gerader Rampensprung,
Mittellinie im Statuenfeld, Stempel vor dem Stoß, normaler Sprung über die Kekslücke); Extras (Stachelfalle verletzt, Graben zu
breit, Knochenhaufen und endgültig besiegt, Hörner-Ameise, Riesenschnappblume, Röhren aus den Fächern, Felsentor-Arm, Leitplanke,
Skulptur rammen, Kontrollpunkt im Ritt, sechs Extraleben). Gemessen (scale 2, inkl. Schattenpass, Messgang alle ~7 m der Route
und Bilder je Abschnitt): 8-1 40–75 Zeichenaufrufe / ≤ 188 k Dreiecke · 8-2 54–111 / ≤ 294 k · 8-3 37–101 / ≤ 223 k.

## Präzisierung (Level 8-Burg)

Additiv zur Welt-8-Liste: Titel und Besonderheiten des Finales 8-Burg. Dateien `src/course/levels/w8/8-Burg.js`, eigene
Hilfen `src/course/levels/w8/_helpers_e.js` (kein `LEVEL`, nur für 8-Burg; reicht `Bld`, `glowField`, `glowPoints`,
`onRespawn` aus `w5/_helpers_b.js` weiter), Test `tests/course_w8e.mjs`. **Kein Motor-Code geändert**; alles Besondere ist
level-lokal (Haken `LEVEL.prebuild`/`build`/`setup`, `level.onStep`/`onSignal`). Bausteine nach „Präzisierung (Motor und
Bausteine Welt 8)“, Endgegner nach „Präzisierung (Gegner Welt 8)“.

### 8-Burg „Gipfelsturm am Brummbär-Turm“ (boss · baronpark · course_finale · 500 s · Abspann)

- ≈ 300 m nach −Z und ≈ 80 m hinauf (Start y 2, Gipfel y 82, Siegerturm y 76); alle Kollision liegt über y 0 (der
  Rummelboden der Kulisse ist 22 m tiefer), `killY` −8. Abschnitte:
  **A Unfallstelle** – Autowrack mit Rauch (fest), Buden, Leitkegel, ?-Block mit Krallen-Anzug; **Seilbahn 1** (fährt los,
  wenn man daraufsteht) aufs erste Dach · **B Dächer** – fünf Rummelhäuser (y 6,6–10,6) mit 3–5 m Lücken (Glühbirnenketten und
  Münzbögen zeigen jeden Sprung), 3 Stachelfallen, 3 Krallen-Pilzlinge, 2 Feuer-Werfer, Dachkram mit Kollision an den
  Rändern; der **Lavabrocken-Regen** aus dem Vulkan links hinten fällt nur über Dach 2–5 (Start-Box) · **C Riesenrad-Platz**
  (Kontrollpunkt) – Karussell, Buden, roter Läufer zum Einstieg; **Riesenrad** (r 13, 8 Gondeln, ≈ 30 m hoch) mit vier
  Schubsern auf den Gondeln 0/2/4/6 (Gruppe `riesenrad`), oben die **Bergstation** (y 34), **Seilbahn 2** hinab zum
  Turmplatz (y 30); wer unter dem Rad in die Grube fällt, kommt über eine Rampe zurück · **D Turm unten** (Kontrollpunkt
  Turmplatz, Boss-Auslöser) – Abschnitt `turm`: der Baron klettert die Kletterrinne voraus, wirft Feuerbälle, rutscht und
  reißt fünf Wandstücke unter den sechs Simsen heraus; oben wacht er am **Kanonenhaus** – erst dann erscheint der
  **POW-Block** (versteckt, `reveal` beim Wachen), ein Stoß wirft ihn hinauf, das **Kanonentor** (`kanonenTor`) geht erst mit
  dem Abschnittsende auf (wer davonläuft, kommt nicht an ihm vorbei) → **Kanonen-Glasröhre 1** · **E Oberer Turm**
  (Kontrollpunkt Türmchen A) – Abschnitt `spiegel`: drei Türmchen (y 62/64/66), zwei Brücken aus je zwei Wegstücken; der
  Baron beginnt am hinteren Rand von A (nicht auf der Kanonen-Landestelle), frisst eine Spiegelfrucht am Rand von A
  (2 Doppelgänger) und eine in der Mitte von B (3 Doppelgänger), die Doppelgänger zerstören die Wegstücke; Kanonentor 2 →
  **Kanonen-Glasröhre 2** · **F Gipfel** (Kontrollpunkt; Plattform Ø 26 m mit Manege-Muster) – Abschnitt `gipfel`:
  **Super-POW-Block** viermal anstoßen, Phasen 1–4 (Feuerbälle, Schockwellen, Doppelgänger), das Glas mit den Freunden steht
  auf dem Block; nach dem Sieg zerbricht es, der Baron fliegt davon und die **Glasröhre zum Siegerturm** (`glasnetz`,
  versteckt, `LEVEL.boss.warp`) erscheint · **G Siegerturm** – die Freunde (Krümel, Flocke, Hoppel, Fernglas-Kobold)
  erscheinen und hüpfen (`freundeFest`), Ansage „Ihr habt uns befreit – danke!“, Feuerwerk (30 Raketen über dem Ziel),
  Glockenbaum, Zielmast. `credits: true`: nach „Weiter“ startet der Abspann (Szene `Credits`), Spielstand `finished`.
- Sterne: 0 **auf dem Uhrturm** des ersten Hauses (nach Seilbahn 1 rechts über das blaue Dach hinauf) · 1 **alle vier
  Schubser vom Riesenrad stoßen** (`onGroup` → Stern erscheint am Einstieg) · 2 **Sternenring** in der ersten Gipfelphase
  (erscheint mit dem Gipfelkampf; 8 Sternmünzen um den Super-POW-Block, 16 s; mit dem Sieg wieder weg). Stempel: am Zielmast
  den **Glockenbaum** hinaufklettern und oben abspringen (vom Boden auch mit Dreifachsprung zu hoch).
- Geheimnisse: unsichtbare Blöcke mit Extraleben über dem Autowrack und über dem Kamin auf Dach 4 (der Kamin ist die
  Stufe); Krallen-Abkürzung: mit dem Krallen-Anzug (?-Block am Start und am Turmplatz) die Kletterrinne hinauf bis zur
  Terrasse; Bitcoin-Pfade (Bögen über den Lücken, Säule im Riesenrad, Ringe auf den Türmchen und am Siegerturm).
- Neustart: Tod in einem Kampfabschnitt setzt nur diesen zurück (Turm: Wandstücke ganz, Kampf beginnt beim Betreten neu;
  Gipfel: die Stöße bleiben). Kameraschienen je Abschnitt (Turm: Neigung 26°, Abstand 18, `xLock`; Gipfel: 30°, 20, Höhe 6,5).

### Hilfen `_helpers_e.js`

Daten: `dach` (Dach-/Platzplatte), `line`/`ring`/`arc`/`column` (Münzen), `sign` · Kulisse: `haus` (Rummelhaus vom
Rummelboden bis zum Dach), `bodenRummel`, `seilPortal`, `kamin`, `dachKram` (Luke, Rohr, Tank, Kisten, Geschenk, Antenne;
mit Kollision), `manege`, `teppich`, `stern`, `banner`, `vulkan`, `trommel`/`kletterfront`/`tuermchen`/`schaft`/`rundDeckel`
(der große Turm), `kelchturm`, `birnenKette`, `schilder` (ein Schild-Atlas), `glockenbaum` (Stamm mit `beanstalk`) ·
Ablauf: `kanonenTor`, `parkKulisse` (Thema baronpark ohne zweiten Turm in der Kulisse), `freundeFest`, `feuerwerk`
(auf der Level-Uhr), `glockenKlang`.

### Test `tests/course_w8e.mjs`

Port 4890 (+ `PORT_BASE`), Teilläufe `PARTS=load,route,sweep,targets,extra,boss,credits,action,shots` (je Lauf < 10 min,
z. B. `load,route` · `targets,extra` · `boss,credits` · `action` · `sweep,shots`), `HEROES`, `ONLY`, `VERBOSE`, `SHOTS`,
`DETAIL`, Bilder `tests/out/w8e_8-Burg_*.png`. Bot mit echter Eingabe (Beine u. a. `wheel`, `schubser`, `pow`, `bump`,
`bridge`, `pipeIn`, `up`, `climb`, `tree`, `triple`, `stompAll`). Geprüft: Laden ohne Konsolenfehler, Metadaten,
Gegnerzahlen; Routen-Bot Lotti und Greta Start → Zielmast (≈ 148/137 s; Baron in allen drei Abschnitten besiegt, POW-Block,
2 Spiegelfrüchte, Super-POW 4×, Phasen 1 → 4, 3 Glasröhren); alle Sterne und der Stempel mit beiden Figuren und Gegenproben
(drei Schubser reichen nicht, Ring vorher unsichtbar, Stempel nicht per Dreifachsprung); Extras (zwei Extraleben,
Krallen-Anzug, Krallen-Abkürzung, Regen schweigt vor Dach 2 und trifft danach, Stachelfallen, Sperre am Kanonenhaus,
Siegerröhre erst nach dem Sieg); Kampf-Neustart Turm und Gipfel; Sieg mit Befreiung, Feuerwerk, Speichern und Abspann.
Gemessen (inkl. Schattenpass): Messgang 54 Punkte 51–99 Zeichenaufrufe (oben auf der Riesenrad-Fahrt am meisten) /
≤ 276 k Dreiecke; Bilder 40–87 / ≤ 274 k; im Gipfelkampf mit Doppelgängern bis 106 Aufrufe.

## Präzisierung (Level 8-A und 8-B)

Additiv zur Welt-8-Liste: Titel und Besonderheiten der beiden Zirkus-Bosslevel 8-A und 8-B. Dateien
`src/course/levels/w8/8-A.js`, `8-B.js`, eigene Hilfen `src/course/levels/w8/_helpers_d.js` (kein `LEVEL`, nur für diese
zwei Level; liest die Zirkus-Hilfen aus 3-B – `circusArena`, `circusProps`, `grandStairs`, `RisingPipe`, `particles` – und
6-C – `gondelRuf`, `lichterketten`, Münzhilfen – unverändert mit), Test `tests/course_w8d.mjs`. **Kein Motor-Code geändert**;
alle Sonderteile sind level-lokal (Hilfsdatei, Haken `LEVEL.prebuild`/`LEVEL.build`/`LEVEL.setup`, `level.onStep`,
`view.onFrame`). Beide Level: Archetyp `boss`, Thema `circus` in einer **lokalen Abend-Variante** (`rummelAbend` im
`prebuild`: violett-oranger Abendhimmel, Kulisse `baronPark` aus `backdrop_w8.js` mit dem Turm des Barons, Riesenrad,
Achterbahn; in 8-B zusätzlich der Lavasee `crystalInferno` – das gemeinsame Thema bleibt unverändert), `starSlots: 3` (zwei
Sterne im Level + der Stern des Endgegners), Stempel, Gegner nach „Präzisierung (Gegner Welt 8): Varianten (8-A, 8-B, 8-Zug)“.

### 8-A „Goldglibber-Zugabe im Brummbär-Zirkus“ (boss · circus · course_bossblob · 400 s, 2 Sterne + Stern der Würfelblase)

- **Rummelplatz** (Anlauf ≈ 28 m, Pflaster mit rotem Teppich): Torbogen, Buden, Karussell, Zuckerwatte-Stände, Plakat
  „Goldglibber – die Zugabe!“, Brummbär-Ballons, goldene Gelee-Brocken; links **Hau den Lukas** (`HauDenLukas`: nur die
  **Stampfattacke** auf die Schlagplatte schlägt den Schlitten bis zur Glocke – Klingeln, „Volltreffer!“, Stern 1 erscheint;
  ein normaler Sprung bringt ihn nur halb hinauf: „Fester – mit der Stampfattacke!“), rechts die **Losbude** mit dem
  Glücksrad-Block (`rouletteblock`: Münzen, 1-Up, Wachstumsbeere, Krallen-Anzug im Wechsel) und die **goldene Zirkuskanone**
  (`roehrenkanone`) → **Ballonloge** hoch über der Treppe (Stempel), Bitcoin-Bogen entlang des Flugs → **Prachttreppe** (18
  Stufen) → **Talstation** (Kontrollpunkt, **Sternenring**) → **Seilbahn** (≈ 27 m) hoch über dem abendlichen Rummel
  (`rummelUnten`: Zelte, Buden, Laternen, Wege – nur Zier) → **Zeltplateau** (Kontrollpunkt, Bühnenschürze an der Kante) →
  **Manege** (gold-lila Zelt `farbZelt`, aufgeschnitten wie 3-B, Publikum jubelt): **goldene Würfelblase** (`color: 'gold'`,
  `waves: 2`, `waveGap: 0.45`) – jede Riesen-Landung schickt zwei goldene Schockwellen über die Manege → Stern 3, Warp-Box →
  **Hinterhof** (Riesenrad-Kulisse, Karussell, Feuerwerk, Plakat „Haltet durch, liebe Freunde!“, Zielmast).
- Sterne: 1 **Hau den Lukas** (Stampfattacke) · 2 **Sternenring** an der Talstation: acht Sternmünzen entlang der Seilbahn
  (16 s; tiefe in Gondelhöhe, hohe 2,5 m über dem Gondelboden, links und rechts – in der fahrenden Gondel hin und her laufen
  und springen; der Stern erscheint am Zeltplateau) · 3 goldene Würfelblase. Stempel: **Ballonloge** (nur mit der Kanone).
  Extraleben: verborgener Block über der Zuckerwatte-Wolke an der Ballonloge, Glücksrad-Block (1-Up im richtigen Takt).
  Gegner: goldene Gelee-Brocken 4, goldene Würfelblase. Konfetti rieselt um die Kamera.

### 8-B „Heiße Manege für den rosa Schlangenkönig“ (boss · circus · course_boss · 500 s, 2 Sterne + Stern des Königs)

- Wie 3-B, aber am Rand des Lava-Infernos: **Vorplatz** (Torbogen, Feuerschalen, Kasse, Zirkuswagen, Plakat „Schlangenkönig –
  heiß wie Lava!“, ?-Block mit **Krallen-Anzug** 2 m hoch); links der **Kletterturm** (`kletterturm`: bunte Kisten mit Griffen,
  alle Seiten kletterbar, 7,5 m), rechts das **Riesenrad** (Motor-Baustein `riesenrad`, r 6,4, 6 Gondeln, Einstiegssteg) →
  **Glutgasse** (Lavagraben mit Holzbrücke und Lavablasen, Buden, Funkenflämmchen; **Lavabrocken-Regen** aus dem Vulkan mit
  Landemarken und kurzen Glutpfützen, jeder dritte Brocken zielt auf die Figur – läuft nur, solange eine Figur in der Gasse
  ist), links die **Schiffschaukel** (`Schiffschaukel`: Schiff an zwei Stangen, bleibt waagerecht, schaukelt sich mit Last auf
  bis 70°, leer schwingt es aus) mit dem **Ausguck** (7 m) → **Prachttreppe** → **Talstation** (Kontrollpunkt) → **Seilbahn**
  über die glühende Lavaschlucht (Felsnadeln mit Kristallen, Lavablasen) → **Zeltplateau** (Kontrollpunkt) → **Manege**
  (rosa-rotes Zelt): **rosa Schlangenkönig** (`color: 'rosa'`, Lavabrocken hinterlassen Lavapfützen, Diener-Schlangen mit
  Tellern – vom Teller aufs Haupt, 3 Treffer) → Stern 3, rosa Röhre → **Hinterhof** (Plakat der Freunde, Zielmast).
- Sterne: 1 **Kletterturm** – Krallen-Anzug aus dem ?-Block holen, hinaufklettern · 2 **Riesenrad** – einsteigen, oben aus der
  Gondel zum Stern über dem Rad springen · 3 rosa Schlangenkönig. Stempel: **Schiffschaukel** – aufschaukeln lassen, am
  höchsten Punkt auf den Ausguck springen. Extraleben: verborgener Block über dem Kletterturm (nur mit Krallen), verborgener
  Block über der Holzbrücke. Gegner: Funkenflämmchen 2 (Krallenhieb besiegt sie), Lavablasen 4, rosa Schlangenkönig.
  Glutfunken steigen um die Kamera auf; ferne Gegner werden nicht gezeichnet (`farHide`).

### Hilfen `_helpers_d.js`

`rummelAbend` (lokale Themen-Variante, `prebuild`), `farbZelt` (Zirkuszelt aufgeschnitten, Bahnen umgefärbt), `manege`
(`circusArena` mit Publikum nur nahe am Zelt), `HauDenLukas`/`hauDenLukas` (Kraftmesser, Stampfen über `onPound`),
`Schiffschaukel`/`schiffschaukel` (MovingBox mit Bordwänden), `kletterturm`, `rummelPflaster` (Teppich, Stern-Mosaik),
`buehnenSchuerze` (Streifen, Goldleiste, Glühbirnen an Inselkanten), `rummelUnten` (Rummel tief unten, gebacken),
`felsNadeln` (Felsen mit Kristallen im Lavasee), `plakat` (Leinwand: Würfelblase, Schlangenkönig, Freunde), `zuckerwatte`,
`glutRand`, `funken`.

### Test `tests/course_w8d.mjs`

Port 4880 (+ `PORT_BASE`), Aufruf `node tests/course_w8d.mjs [8-A|8-B]`, Teilläufe `PARTS=load,route,sweep,targets,extra,shots`
(je Lauf < 10 min, z. B. `load,route,sweep` · `targets,extra` · `shots`), `HEROES=lotti,greta`, `ONLY=<Text|Text>`,
`VERBOSE=1`, `SHOTS=<Name|Name>`, `DETAIL=1`, `TRACE=<Bedingung>`; Bilder `tests/out/w8d_*.png`. Bot mit echter Eingabe (auf
der Route unverwundbar, Trefferversuche gezählt), auch in beiden Bosskämpfen (Würfelblase: ausweichen, über die goldenen
Wellen springen, im Fliehen auf den Hut; Schlangenkönig: Landemarken und Pfützen meiden, auf den Teller unter dem Kopf, vom
Teller aufs Haupt). Beine u. a. `pound`, `kanone`, `gondel` (mit Sternmünzen), `roulette`, `climb`, `rad`, `schaukel`,
`attack`, `pipe`, `blase`, `koenig`, `welle`. Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen; Routen-Bot Lotti
und Greta Start → Zielmast; alle Sterne und Stempel mit beiden Heldinnen samt Gegenproben (Lukas nicht ohne Stampfen,
Sternenring nicht ohne Springen, Stempel nicht ohne Kanone; Kletterturm nicht ohne Krallen, Riesenrad-Stern nicht vom Steg,
Ausguck nicht vom Boden); Extraleben, Kontrollpunkte (Gondel kommt zurück), goldene Schockwelle trifft, Lavabrocken trifft,
Krallenhieb gegen Funkenflämmchen, Lavagraben, Absturz, Lavapfützen im Kampf, Kampf-Neustart (beide Endgegner); Messgang und
Bilder. Stand: 8-A 17 + 18 + 2 Prüfungen, 8-B 18 + 18 + 2 (load/route/sweep ≈ 4 min, targets/extra ≈ 3 min, shots ≈ 5–7 min).
Gemessen (scale 2, inkl. Schattenpass): 8-A Route ≈ 81 s (Lotti) / 83 s (Greta), Messgang 30 Punkte ≤ 82 Zeichenaufrufe /
≤ 262 k Dreiecke, Bilder 56–82 / ≤ 256 k · 8-B Route ≈ 64 s / 58 s, Messgang 28 Punkte ≤ 99 / ≤ 271 k, Bilder 65–107 / ≤ 266 k
(am meisten oben im Riesenrad mit Blick über den ganzen Glut-Rummel).

## Präzisierung (Level 8-Zug, 8-4 und 8-5)

Additiv zur Welt-8-Liste: Titel und Besonderheiten der Level 8-Zug, 8-4 und 8-5. Dateien `src/course/levels/w8/8-Zug.js`,
`8-4.js`, `8-5.js`, eigene Hilfen `src/course/levels/w8/_helpers_b.js` (kein `LEVEL`, nur für diese drei Level; reicht
`isl`, `line`, `ring`, `arc`, `column`, `Bld`, `litTop`, `gradY`, `glowPoints`, `onRespawn` aus `w5/_helpers_b.js` weiter),
Test `tests/course_w8b.mjs`. **Kein Motor-Code geändert**; alle Sonderteile sind level-lokal (Hilfsdatei, Haken
`LEVEL.prebuild`/`LEVEL.build`). Bausteine nach „Präzisierung (Motor und Bausteine Welt 8)“, Gegner nach „Präzisierung
(Gegner Welt 8)“.

### 8-Zug „Brummbär-Express im Abendrot“ (autoscroller + boss · train · course_baronexpress · 400 s)

- **Fahrt-Illusion** (Entscheidung wie die Laufband-Illusion der Bossstraße): Der Zug steht in Weltkoordinaten still; Gleisbett,
  Viadukt-Wände, Talboden (Felder, Hecken, Bach, Teiche), Laternen, Fahnen, Bäume, Häuschen, Rummelzelte, Ballons und der
  Startbahnhof ziehen mit dem Fahrweg S(t) vorbei (9 m/s, 3 s Anfahren), Uhr = `level.scroll.clock` (deterministisch, ein
  Neustart setzt sie mit dem Bildfenster zurück). Die Räder drehen mit S/r, die Lok dampft. So bleiben Becken, Hebeblock und
  Gegner auf festem Boden; Springen auf dem Zug fühlt sich an wie auf dem Boden. Das Bildfenster (`LEVEL.scroll`, Pfad nach −Z,
  Fenster 5/8 m) gleitet mit 0,85–2,1 m/s über die Wagen; Abfahrt 1,5 s nachdem eine Figur auf dem Zug steht (`trigger`).
  Abendthema als lokale Variante von `train` (`LEVEL.prebuild`): violett-oranger Himmel, Hügel, Riesenrad, Baron-Turm am
  Horizont, Feuerwerk (im Leuchtfeld, 0 zusätzliche Zeichenaufrufe).
- Wagen (z ab 0 nach −Z, Kupplung 0,6 m): Aussichtswagen (Balkon zum Bahnsteig, Kofferstapel aufs Dach) → Güterwagen k1 /
  Steinblock-Flachwagen f1 / k2 / Gitterwagen f2 (Bordgitter 0,9 m) / k3 / Gitterwagen f3 → Becken t1 → Kontrollwagen f4 →
  Becken t2 → Doppelstock-**Salon** (18 m, Türen hinten/vorn, Glaskuppel) → Kistenwagen f5 → **Gepäckwagen** (Dach 4,4 m mit
  goldener Luke, Innengang, Vordertür) → f6 mit der **Bossröhre** → Tender → Lok mit Bärengesicht, Monokel und
  Zylinder-Schornstein (Farben wie der Express auf der Weltkarte). Obere Wagenaufbauten (Güterwagen, Beckenwände, Salon,
  Gepäckwagen) liegen in **einem** Mesh und blenden je Wagen gerastert aus (Bayer-Muster, deckend gezeichnet), solange die
  Figur darin ist oder der Wagen zwischen Kamera und Figur steht. Kamera der Fahrt schräg von hinten rechts (Gier 30°,
  Neigung 21°), so ist das Abendrot zu sehen.
- Gegner: Hackvogel 4 (Dächer, einer hackt die Steinblock-Ladung auf), Schubser 3 (Gitterwagen: schubsen zurück, nicht
  vom Zug), Wutkaulquappe 4 (in den Becken zwischen **Schwimmkisten** – man kann schwimmen oder hüpfen), Mini-Pilzling 5
  (Salon), Feuer-Werfer 1 (Gepäckgang), Hammer-Werfer 1 (vor der Bossröhre), **Schattenläuferin 2** (`round: 2`).
- **Bossröhre** mit rotem Deckel (`roehrenDeckel`): nimmt erst beim Halt auf (`scroll.reveal: [{ id: 'deckel', at: 'done' }]`).
  Sie führt zur **Drehbühne** des vorausfahrenden Bühnenzugs (gleiches Gleis, z −400; Bühne r 9,2 m mit Gold-Geländer,
  Glühbirnenmasten, Wimpeln; Ring aus Stäben bis 5 m, Decke 6,4 m). Der Bühnenzug liegt in einer **Nah-Gruppe**
  (`nahGruppe`, nur gezeichnet, wenn die Figur < 190 m entfernt ist). Nach dem Sieg trägt die Warp-Box zum **Zielwagen** mit
  Zielmast. Kontrollpunkte: Kontrollwagen f4 und Bühne.
- Sterne: 0 **gleich oben auf dem Aussichtswagen** (Kofferstapel) · 1 **Sternring** auf dem Kontrollwagen (8 Sternmünzen bis
  übers zweite Becken, 13 s; Stern über dem vorderen Beckenrand) · 2 **Gang im Gepäckwagen** (durch die goldene Dachluke,
  am Feuer-Werfer vorbei). Stempel: **Hebeblock** im Salon (`hebeblock`): zweiter ?-Block unter einer Deckenluke – vom Klavier
  auf den Block, Stampfen fährt ihn 2 m hinauf, er stößt die Luke auf, der Stempel liegt in der Glaskuppel (die Luke ist sonst
  fest; vom ruhenden Block kommt niemand hinein). Geheimnisse: unsichtbarer Block über dem Tender (Extraleben, erst nach dem
  Halt erreichbar), Münzen unter Wasser, ?-Blöcke mit Funkenblüte (Balkon) und Krallen-Anzug (Salon).

### 8-4 „Glimmstege der Mitternachtsfestung“ (parcours · nightfort · course_footlight · 400 s)

- Fast alle Wege sind **Leuchtstege** (`leuchtsteg`, Kacheln aus `stege`): Burgbalkon (Start) → goldener Zickzack-Steg mit
  drei Stampfsteinen (Aufschläge lassen den Steg weit aufleuchten) → türkiser Knochenflieger-Steg (2 Gruppen) → Laternenhof
  (Kontrollpunkt) → rosa Steg mit vier Stachelwalzen → Kanonengasse 1 (Projektilköpfe) → Zwischenhof → Kanonengasse 2
  (Suchköpfe auf Pfeilern) → Warp-Box → Zielturm. Die Festung schwebt im Nachthimmel: Sterne im Abgrund (`sternenAbgrund`),
  Mond, aufsteigende Himmelslaternen, Glühwürmchen, Lampions, Feuerschalen, Teppiche, Zinnen.
- Sterne: 0 **isolierter Steg** links neben dem Knochenflieger-Steg (Sprung über den Abgrund) · 1 **Sternring** am
  Laternenhof (ein Teil der Münzen auf einer unsichtbaren Schleife) · 2 **Rätselbox** hinter dem Stempel → Stampfstein-
  Kammer (x 80). Stempel: auf der **unsichtbaren Treppe** rechts vom Zwischenhof. Geheimnisse: unsichtbarer Block mit
  Extraleben am Burgbalkon, ?-Block mit Funkenblüte, Münzblock in der Kammer, Wegweiser-Funkeln an Steg-Ecken.
- Gegner: Stampfstein 5, Knochenflieger-Gruppe 2, Kanonenturm 3.

### 8-5 „Flutverlies der Brummbär-Festung“ (parcours unterwasser, Archetyp `parcours_ride` · dungeon · course_dungeon · 400 s)

- Schleusenhof (Start, Krallen-Anzug) → **Steigbecken** (12 × 24 m; nur mit dem Hochwasser an die hohe Ausgangskante) →
  drei **Wasserkörper** über der Schlucht → Kontrollpunkt → vier **blaue Stachelblöcke** (fahren im Takt quer, Oberseite trägt)
  → **Pflaume-Kanal** (`LEVEL.ride`, Steg mit Pflaume) → Bogenhalle → **Fallblock-Brücke** (Kette, stürzt hinter der Figur
  ein) → **rote Stachelblöcke** (Schleifen um zwei Pfeiler, Pendel vor dem Ausgang) → **Stachelwand-Gang** (Wand rückt vor
  und zurück, Nischen) → Endsaal mit Röhre zum Ziel oder **Wolkenkanone** in den Münzhimmel → Seeufer mit Zielmast. Kulisse:
  Bogenmauern mit Gitterfenstern (`flutMauern`, Kronen mit Moospolstern, Korallen, Seesternen), Korallen, Fischschwärme.
- Sterne: 0 **unsichtbare Kletterwand** an der Ausgangskante (Krallen-Anzug; Münzsäule als Hinweis) · 1 nach dem Ritt die
  **Bogenwand** hinauf, über verschwindende Fallblöcke · 2 **Münzhimmel** (Wolkenkanone, Wolken-Hüpfer, Röhre zurück zum
  Ziel). Stempel: auf dem blauen Stachelblock mitfahren, **Nische oben links**. Geheimnisse: unsichtbarer Block mit Extraleben
  im Endsaal, Münzblock am Kontrollpunkt, Krallen-Anzug aus drei ?-Blöcken. Keine Gegner (Gefahren sind die Bausteine).

### Hilfen `_helpers_b.js`

Allgemein: `stege` (Leuchtsteg aus Rechtecken), `plate` (unsichtbare Kollision), `glowPoints` · 8-4: `burgZinnen`, `laternen`,
`teppich`, `feuerschalen`, `himmelslaternen`, `mond`, `gluehwuermchen`, `sternenAbgrund` · 8-5: `flutMauern`, `korallen`,
`fischSchwaerme` · 8-Zug: `fahrweg`, `abendExpressThema`, `wagenreihe`, `baronZug` (Wagenarten aussicht, flach mit Bord/Gitter,
kasten, tank, salon, gepaeck, tender, lok; Versatz `x`, Nah-Gruppe `near`), `fahrtIllusion` (Gleise, Requisiten,
`skipLamps`/`lampHide`, Räder, Dampf, Bahnsteig als `MovingBox`), `bahnhofOptik`, `hebeblock` (mit Deckenluke), `moebel`,
`glasKuppel`, `wimpel`, `buehne`, `roehrenDeckel`, `nahGruppe`, `feuerwerk`.

### Test `tests/course_w8b.mjs`

Port 4860 (+ `PORT_BASE`), Aufruf `node tests/course_w8b.mjs [8-Zug|8-4|8-5]`, Teilläufe `PARTS=load,route,sweep,targets,
extra,shots` (je Lauf < 10 min, z. B. `load,route,sweep` · `targets,extra` · `shots`), `HEROES`, `ONLY` (mehrere mit `|`),
`VERBOSE`, `SHOTS`, `DETAIL`, `TRACE`, Bilder `tests/out/w8b_<Level>_*.png`. Bot mit echter Eingabe über
`__course.setInput/step` (auf der Route unverwundbar, Treffer-Versuche werden gezählt; Gegenproben verwundbar). Beine u. a.
`dodge` (über Schubser), `boss` (Schattenläuferin: aufs Original springen), `leap`, `cross`, `follow`, `climb`, `onBlock`,
`niche`, `mount`/`ride`, `warp`, `pound`, `coins`, `stompAll`. Beim Autoscroller stellt `win` das Bildfenster für Ziele, Bilder
und Messgang (`place(pos, { win: 'auto' | s })`). Geprüft: Laden ohne Konsolenfehler, Metadaten, Gegnerzahlen bzw. benannte
Bausteine; Routen-Bot Lotti und Greta Start → Zielmast (8-Zug ≈ 122/121 s mit Stern 1, Bossröhre, drei Sprüngen aufs Original
der Schattenläuferin, Warp-Box, Mini-Pilzlinge und Hammer-Werfer besiegt; 8-4 ≈ 49/44 s ohne Treffer-Versuch, Stampfsteine
lassen den Steg aufleuchten; 8-5 ≈ 79/78 s ohne Treffer-Versuch, Hochwasser, drei Wasserkörper, Ritt auf Pflaume); alle Sterne
und Stempel mit beiden Figuren und Gegenproben (Sternringe nicht ohne alle Münzen, Stempel nicht ohne Stampfen/Luke zu,
8-5 Stern 1 nicht ohne Krallen-Anzug, Steigbecken bei Niedrigwasser); Extras (Bahnsteig fährt davon, Becken schwimmend,
Funkenblüte, Krallen-Anzug, Hackvogel hackt Steinblöcke auf, Bossröhre vor dem Halt zu, Leuchtsteg-Proben, je ein Extraleben).
Gemessen (scale 2, inkl. Schattenpass): 8-Zug Messgang Ø 83, ≤ 101 Zeichenaufrufe / ≤ 199 k Dreiecke, Bilder 44–95 / ≤ 211 k;
8-4 Messgang Ø 27, ≤ 46 / ≤ 144 k, Bilder 22–47 / ≤ 134 k; 8-5 Messgang Ø 57, ≤ 82 / ≤ 208 k, Bilder 34–84 / ≤ 217 k.

## Präzisierung (Modelle Bonuswelten) (Hauptsitzung)

Kurzübersicht; exakte `opts`/`state` in den Kopfkommentaren von `src/course/models/kinds/gimmicks_star.js`,
`bahnen_star.js`, `props_weltraum_star.js`, `props_retro_star.js`, `krone_bonus.js`, `src/course/models/lib/starGeos.js`
und `instanced_star.js`. Test `tests/course_models_star.mjs`.

- **Gimmicks (Spielzeug-Look):** `drehplatte` (`size`, `thick`, `axis 'z'|'x'`, `color`, `back`; `state.tilt`, `shake`),
  `farbplatte` (`colors [a,b]`; `state.color 0..1`, `flash`), `plattenwand` (eine Platte, fährt nach +X; `state.out`,
  `warn`), `zielmast_fluegel` (`height` 8; `state.fly`, `flap`, `flagY`), `riesen_frageblock_turm` (`part
  'segment'|'kopf'`; `state.out`, `anim 'idle'|'bump'`), `wabe` (`kind 'normal'|'lava'|'eis'`, `size` = Umkreisradius,
  Rasterabstand √3·size; `state.press`, `flash`), `nebelplattform` (`state.fade`), `kanonenkugel_tritt` (Ursprung
  Kugelmitte; `anim 'idle'|'fly'|'step'`), `diorama_drehscheibe` (`radius`, `height`, `teeth`; `angle|speed`),
  `laufbombe` (`anim 'idle'|'walk'|'fuse'|'boom'|'carried'|'thrown'`), `felsblock_riss` (`state.break 0..1`),
  `schienenwalze` (Achse X, Ursprung Laufkante; `radius`, `length`; `angle|speed`, `userData.axleY`),
  `schienenbrett` (Deck y 0,62; `speed`, `anim 'idle'|'fall'`), `weiche` (`state.dir`, `hit`, `userData.target`).
- **Kulisse (backbar, ohne Spielzeug-Look):** `walzen_schiene`, `brett_schiene` (`kind 'gerade'|'bogen'`), `planet`
  (neu additiv `opts.kind 'ring'|'pilz'|'blume'|'eis'`; ohne `kind` unverändert wie Welt 2), `sternschnuppe`,
  `spielzeugrakete`, `regenbogenweg` (`length`, `width`, `bend`, `rise`; `userData.end`), `wabensaeule`,
  `weltraum_antenne`, `weltraum_kuppel`, `sternen_torbogen`, `retro_block` (`kind 'gras'|'erde'|'ziegel'|'frage'|'hart'`),
  `retro_wolke`, `retro_busch`, `riesenpflanze` (`kind 'blume'|'pilz'|'blatt'`), `schneegrab`, `nebelbank`
  (durchsichtig, nicht backen; für S-8 statt `nebelschwaden` empfohlen); Krone: `krone_podest`, `pokal_gross`.
- **Instanz-Varianten:** `wabe`, `farbplatte`, `drehplatte`, `retro_block` (je ≤ 900 Dreiecke).
- **Nicht vorhanden:** `krakenpilz`, `tintling` (Gegner – gehören zum Gegner-Agenten der Bonuswelten).

## Präzisierung (Motor und Bausteine Bonuswelten)

Ergänzung des Motor-/Bausteine-Agenten für die Bonuswelten: **Remix-Technik** (Pilz, Blume; Vertrag „Remix-Level“ oben) und
**Motor, Bausteine und Themen der Welt Stern** „Sternenzelt“ (Stand: Sternenwerkstatt `0-34`, Remix-Beispiele `0-R1`,
`0-R2`). Nichts oben Festgelegtes wird geändert; alles ist additiv. Jede Datei dokumentiert ihre Felder vollständig im
Kopfkommentar. Alle Stern-Bausteine sind `type` in `segments` **und** `kind` (Hülle wie Welt 7/8, `level.spawn(kind, spec)`;
`level.named.get(id)` = Griff), Aktionen im bekannten Format (Signal-Verben `start`/`stop`/`toggle` rufen die gleichnamigen
Methoden der benannten Griffe). Takte laufen auf der Level-Uhr (`level.time`) – deterministisch. Richtungen im 90°-Raster,
Level verlaufen nach −Z. Jeder Baustein nutzt die Registry-Modelle der Bonuswelten („Präzisierung (Modelle Bonuswelten)“,
Tabelle „Modelle“ unten); ohne Modell bzw. mit `look: 'eigen'` baut er eigene Ersatz-Optik mit gleicher Kollision und Mechanik.

### Präzisierung (Motor und Bausteine Bonuswelten): Dateien

```
src/course/level/remix.js                   remixOf(base, rules), resolveRemix, refreshRemix, isRemix, cloneData, applyFilter,
                                            setRemixSource (Registry meldet getLevel an); window.__courseLevels (Tests)
src/course/view/themeVariants.js            Licht-Varianten <thema>@<licht>[+sw] (LIGHTS, lightVariant, remixTheme,
                                            themeFromName – als THEME_HOOKS.resolve in getTheme eingetragen)
src/course/blocks/starkit.js                star(level) Sammelstelle, Kostüme (unlockOutfit/hasOutfit/outfits), camYawAt/yawIn,
                                            PlateSet, cullSphere, useModel, instancedModel, ModelSet, bakeRoot, sphereOf, …
src/course/blocks/types/star_zeituhr.js     zeituhren
src/course/blocks/types/star_platten.js     drehplatte, farbplatten, plattenwand
src/course/blocks/types/star_walze.js       schienenwalze, walzenraum
src/course/blocks/types/star_draufsicht.js  draufsicht, waben
src/course/blocks/types/star_nebel.js       nebelplattform, nebelboden
src/course/blocks/types/star_schiene.js     schienenbrett (mit Weichen), kanonenkugel_wand
src/course/blocks/types/star_diorama.js     drehdiorama
src/course/blocks/types/star_misc.js        Entitäts-Gimmicks als type (auch list), sternenglanz
src/course/blocks/types/deco_star.js        deco_star (Kulisse; Registry-Modelle gebacken)
src/course/entities/kinds/star_gimmicks.js  fliegender_zielmast, scheinziel, felsblock, riesen_frageturm, laufbombe; Hüllen
src/course/view/theme_starspace|rainbow|galaxy|woodspace|blockland|honeycomb|grotto|fogbog|cosmic|bossblitz.js
src/course/view/backdrop_star.js            Kulissen-Bausteine der Themen (Sternenkugel, Sternschnuppen, Nebel, Planetoiden …)
src/course/levels/w0/0-34.js                Sternenwerkstatt (Stationen S0–S13 mit Schildern, marks für den Test)
src/course/levels/w0/0-R1.js, 0-R2.js       Remix-Beispiele (Nacht-Remix von 1-1; Ausschnitt von 2-4 mit Zeitdruck)
tests/course_star_blocks.mjs                Port 4900, SB_PART=remix|mech|themes, SB_SHOTS=0, Bilder tests/out/sb_*.png
```

Additiv geändert (je wenige Zeilen, mit Kommentar): `course/levels/index.js` (`getLevel` löst Remix-Platzhalter auf,
`setRemixSource`), `course/CourseScene.js` und `course/player/powers/stern.js` (Levelmusik mit Klang-Variante:
`music.play(LEVEL.music, LEVEL.musicVariant ? { variant } : undefined)`), `course/view/themes.js` (`THEME_HOOKS.resolve`
in `getTheme` für `?theme=<thema>@<licht>` und 10 Registrierzeilen `??=`). Motor (Player, Level, Kollision) unverändert.
Das Welt-Stern-Weltraumthema heißt `starspace` (`space` bleibt das Welt-2-Thema von 2-2).

### Präzisierung (Motor und Bausteine Bonuswelten): Remix-Helfer (exakt)

```js
import { remixOf } from '../../level/remix.js';
export const LEVEL = remixOf('2-4', { id: 'P-1', world: 10, title: 'Eigener Titel', light: 'nacht', … });
```

`remixOf(base, rules)` liefert einen **Platzhalter** `{ id, world, title, archetype?, remix: { base, rules } }`; die Registry
(`levels/index.js getLevel`) löst ihn beim ersten Abruf auf und liefert danach ein gewöhnliches LEVEL (gemerkt;
`refreshRemix(platzhalter)` vergisst die Auflösung). `base` = Level-Id (über die Registry – auch ein anderer Remix) oder das
LEVEL-Objekt selbst (`import { LEVEL as BASIS } from '../w2/2-4.js'`). Der Remix arbeitet auf einer tiefen Kopie der Daten
(Funktionen und Klassen-Objekte werden geteilt): **die Basis bleibt unverändert, Änderungen der Basis wirken im Remix mit**.
Fehlt die Basis, entsteht ein leeres Level mit `remix.missing = true` und einer Warnung.

| Regel (Anwendung in dieser Reihenfolge) | Wirkung |
| --- | --- |
| `id`, `world`, `title` | Pflicht/Meta (eigener deutscher Titel) |
| `keep: { box: [x0, y0, z0, x1, y1, z1] \| [x0, z0, x1, z1], hooks: 'filter' \| 'all' \| false, camera: true, margin: 2 }` | Abschnitt kürzen: nur Objekte, deren Hüllquader den Bereich (± margin) schneidet, bleiben – segments, blocks, enemies, items, Unterlisten `items` der Kulissen-Bausteine, checkpoint, stars, stamp, goal (nach Anker), Kameraschienen (nach z/area, `camera: false` lässt sie). Haken der Basis: `'filter'` (Standard; statische Geometrie und feste Formen ganz außerhalb entfallen, Entitäten außerhalb werden gleich wieder entfernt), `'all'` (ungefiltert), `false` (nicht ausführen) |
| `remove: [Auswahl …]` | Einträge entfernen (Daten und Entitäten aus den Basis-Haken) |
| `replaceKind: { alt: 'neu' \| { kind: 'neu', …Felder } }` | Art ersetzen: blocks/enemies/items, Entitäten der Basis-Haken **und alle Laufzeit-spawns** (?-Blöcke, Werfer …); `{ huepfmaus: 'huepfmaus_stachel' }` |
| `replaceType: { alt: 'neu' \| { type: 'neu', …Felder } }` | Baustein-Typ in segments ersetzen |
| `replace: [{ match: Auswahl, with: { … } \| (eintrag) => eintrag \| eintrag[] \| null }]` | Objekt = neuer Eintrag (übernimmt pos/from/to/path, wenn er keine eigenen hat); Funktion frei (null entfernt, Liste = mehrere) |
| `change: [{ match: Auswahl, set: { … }, move: [dx, dy, dz], fn(eintrag) }]` | Felder setzen, verschieben, frei ändern |
| `beepSpeed: 4`, `beepWarn: false` | Piep-Blöcke (piep_block/_treppe/_rutsche): `every = max(1, round((every ?? 8) / beepSpeed))`, `warn = 0` bei beepWarn false, sonst `min(every − 1, warn ?? 3)`; setzt auch `LEVEL.beepSpeed`/`beepWarn` |
| `stars: [[x, y, z] \| { pos, id, hidden } …]` \| `{ 0: [x, y, z], 2: null }` \| `false` | alle Sterne neu bzw. je Index setzen/entfernen bzw. keine |
| `stamp: false \| [x, y, z] \| { pos }` | Stempel aus (Pilz/Blume) bzw. neu |
| `clocks: [[x, y, z] …] \| { list, sec: 10, id }` | Zeit-Uhren (Baustein `zeituhren`: +sec Restzeit je Uhr) |
| `add: { segments, blocks, enemies, items }` | neue Objekte (nach allen anderen Listen-Regeln) |
| jedes andere Feld (`timeLimit`, `start`, `goal`, `checkpoint`, `camera`, `killY`, `theme`, `archetype`, `marks` …) | überschreibt das der Basis (`marks` werden zusammengeführt; `checkpoint: null` = keiner) |
| `music: { theme?, variant? } \| 'variante'` | Thema (Standard: das der Basis) + Klang-Variante (`nacht`, `abend`, `morgen`, `tag`, `dunkel`, `schnell`, `schwarzweiss`) → `LEVEL.music` (Name) + `LEVEL.musicVariant`; CourseScene und Funkelstern spielen `music.play(thema, { variant })`. Ohne Regel bleibt die Musik der Basis (auch deren Variante bei `{ theme, variant }`) |
| `light: 'nacht' \| 'abend' \| 'morgen' \| 'tag' \| 'dunkel'` | Beleuchtung: Themen-Variante `<thema>@<licht>` (Himmel, Nebel, Licht, Sonne/Mond, Sterne, Figuren-/Laternenlicht, Gelände-Farben getönt; `tag` bei Weltraum-Themen = Taghimmel statt Weltraum) |
| `filter: 'schwarzweiss'` | Graustufen-CSS-Filter über der 3D-Leinwand (HUD bleibt bunt), endet mit der Szene; Thema `<thema>@<licht>+sw` |
| `prebuild/build/setup(level, scene?)`, `onStep(dt, t, level)` | eigene Haken (laufen nach denen der Basis) |
| `baseHooks: true \| false \| { prebuild, build, setup }` | Haken der Basis (einzeln) abschalten |

**Auswahl** (remove, replace, change): Objekt, alle Bedingungen müssen passen – `id: 'x' | [...]`, `kind`, `type` (je Name oder
Liste), `box: [x0, y0, z0, x1, y1, z1] | [x0, z0, x1, z1]` (Anker liegt im Bereich: pos, Mitte from–to, erster Pfadpunkt,
erstes Teil), `in: 'segments' | 'blocks' | 'enemies' | 'items' | 'deco' (Unterlisten items der Kulissen) | Liste` (Standard:
die vier Listen), `where: (eintrag, liste) => bool`. Kurzform `'name'` = id, kind oder type gleich name.
**Ergebnis** `LEVEL.remix = { base, removed, replaced, changed, added, kept, cut, light, filter, variant, missing }`.

Beispiele: `0-R1` (Nacht-Remix von 1-1):

```js
remixOf('1-1', { id: '0-R1', world: 0, title: 'Kraxelwiese bei Mondschein', light: 'nacht', music: { variant: 'nacht' },
  timeLimit: 400, stamp: false, replaceKind: { pilzling: 'huepfmaus' }, remove: [{ kind: ['bunny', 'itemtree'] }],
  change: [{ match: { kind: 'question', box: [-4.5, 5, -12.2, -3.5, 7, -11] }, set: { content: 'funkenbluete' } }],
  stars: [[-3.5, 11.2, -76], [8, 13.2, -98.5], [7.4, 4.95, -159]],
  clocks: { id: 'uhren', list: [[0, 2.2, -2], [-4, 5.4, -26], [-1, 5.4, -58]], sec: 10 },
  add: { enemies: [{ kind: 'huepfmaus_stachel', id: 'nacht_stachel', pos: [0, 7, -112], path: [[-4, 7, -112], [4, 7, -112]] }] } });
```

`0-R2` (nur der Rollhügel von 2-4, 30 s, Zeit-Uhren als Ideallinie, Abendrot, schnelle Musik):

```js
remixOf(HUEGELMUEHLE, { id: '0-R2', world: 0, title: 'Walzenhatz gegen die Uhr',
  keep: { box: [-14, -4, -24, 14, 24, -110], margin: 0.5 },
  remove: [{ box: [-10, 0, -25, 10, 12, -20] }, { id: ['g_links', 'g_rechts', 'p_hinab'] }, { type: 'sign', box: [-8, 0, -104, -2, 10, -100] }],
  replaceKind: { huepfmaus: 'huepfmaus_stachel' }, light: 'abend', music: { variant: 'schnell' }, timeLimit: 30,
  clocks: { id: 'uhren', sec: 8, list: [[0, 7.2, -34], [0, 7.2, -47.5], [0, 7.2, -60.5], [-3, 7.2, -78], [2, 7.2, -92]] },
  start: { pos: [0, 6, -27], yaw: Math.PI / 2 }, checkpoint: null, goal: { pos: [0, 6, -104], height: 7 }, stamp: false,
  stars: [[9, 7.2, -36], [7, 10.4, -74], [-9, 7.2, -100]] });
```

Weitere Muster: B-6 `{ filter: 'schwarzweiss', music: { variant: 'schwarzweiss' }, add: { enemies: [...] } }`; B-8
`{ beepSpeed: 4, beepWarn: false }` (Musik der Basis – Taktkopplung bleibt); B-10 `remixOf('S-6', { light: 'tag', music:
{ variant: 'tag' } })` (honeycomb@tag: Taghimmel); P-4 `keep` + `timeLimit: 100`. Licht-Varianten lassen sich ohne Remix mit
`?theme=<thema>@<licht>` ansehen (z. B. `?course=1-1&theme=grass@abend`).

### Präzisierung (Motor und Bausteine Bonuswelten): Bausteine und Arten (Felder exakt im Kopfkommentar)

| Typ / Art | Kern | Wichtige Felder (Standard) → Griff | Beispiel |
| --- | --- | --- | --- |
| `zeituhren` | schwebende goldene Wecker: Berühren = +sec Restzeit, Ansage „+10 Sekunden“; eingesammelte bleiben nach Checkpoint-Neustart weg | `list` [[x, y, z] …] \| `from`, `to`, `n` \| `pos`, `sec` 10, `size` 1, `color` 'gold' \| 'silber' \| 'rosa', `banner` true → `{ got, items, sec, info() }` | `{ type: 'zeituhren', id: 'uhren', list: [[0, 2, -20], [2, 2.5, -34]], sec: 10 }` |
| `drehplatte` | Platte kippt nach dem Betreten (Vorwarnung zittert) um 90°, hängt, dreht zurück; ab 30° nicht mehr fest; Boost-Pfeil möglich | `pos` (Oberseite), `size` [2, 0.3, 2], `grid` \| `tiles` \| `from`/`to`/`n`, `spacing`, `axis` 'x' \| 'z', `mode` 'stand' \| 'takt' (`wait` 2, `phase`, `stagger` 0.4), `delay` 0.45, `warn` ≤ 0.3, `tilt` 0.3, `hold` 1.2, `back` 0.45, `color` 'blau', `color2` 'gelb', `arrow` [dx, dz] \| false, `speed` 15 → `{ plates [{ state 'ruhe'\|'warn'\|'kippt'\|'haengt'\|'zurueck', k, tilts }], tilts, start(), stop(), reset(), info() }`; Form-Tag `drehplatte` | `{ type: 'drehplatte', id: 'dreh', pos: [0, 0, -40], grid: [3, 2] }`; Boost-Strecke `{ …, from: [0, 0, -60], to: [0, 0, -84], n: 9, delay: 0.25, arrow: [0, -1] }` |
| `farbplatten` | Betreten färbt um (from → to); alle umgefärbt → Ereignis; `toggle` = Schachbrett-Rätsel; `time` = Zeitrennen | wie drehplatte (Lage), `from` 'blau', `to` 'gelb', `toggle` false, `onAll` Aktion \| `star` Index, `at`, `time` 0 → `{ plates [{ on }], count, done, reset(), info() → { count, of, done, map } }` | `{ type: 'farbplatten', id: 'schach', pos: [0, 0, -100], grid: [3, 3], star: 0 }` |
| `plattenwand` | senkrechte Wand mit **Schubplatten**: fahren waagerecht heraus (Trittstufen), Vorwarnung, fahren ein (wer drauf ist, fällt); Wand fest (Wandsprung) | `pos` (Mitte Unterkante der Wandfläche), `dir` [0, 1], `size` [6, 8], `grid` [3, 4] (Stufe r bei (r + 1)·h/(Reihen + 1)), `depth` 1.6, `plate` 0.6, `gap` 0.3, `thick` ≥ depth + 0.1, `mode` 'takt' \| 'treppe' \| 'signal', `order` 'treppe' \| 'reihe' \| [[c, r] …], `period` 5, `out` 2.4, `move` 0.35, `stagger` 0.45, `near` 6, `warn` 0.6, `color` 'rot', `wall` 'weiss' \| 'grau' → `{ panels [{ col, row, k, solid, state, mb }], start(), stop(), info() → { out '#~.', solid, running, opened } }`; Formen `plattenwand`, `plattenwand-stufe` | `{ type: 'plattenwand', id: 'wand', pos: [-3, 0, -78], size: [6, 8], grid: [3, 4], mode: 'takt' }`; Treppe `{ …, mode: 'treppe', near: 4 }` |
| `schienenwalze` | Holzwalze rollt auf Schienen den Pfad entlang; Oberfläche läuft gegen die Fahrt (`roll`): mitlaufen = oben bleiben; Ende fallen/halt/zurück, respawn | `path` (Achsmitte) \| `pos` + `to`, `radius` 1.6, `length` 7, `speed` 2.6, `roll` 1.1, `start` 'stand' \| 'auto' \| 'signal', `wait` 0.35, `end` 'fallen' \| 'halt' \| 'zurueck', `respawn` 3, `rails` true, `posts` 2 (Stützen), `style`, `slice` 0.3 → `{ state 'ruhe'\|'wartet'\|'rollt'\|'ende'\|'faellt'\|'weg'\|'zurueck', s, pos, rolls, carried(), start(), stop(), reset(), info() }`; Tag `schienenwalze` | `{ type: 'schienenwalze', id: 'walze', path: [[0, -1.4, -86.8], [0, -1.4, -117]], radius: 1.4, length: 6 }` |
| `walzenraum` | hohle Riesenwalze dreht per Schalter in 90°-Schritten; Einbauten und Items drehen mit, Figuren schweben während der Drehung | `pos` (Achsmitte), `radius` 4, `length` 8, `axis` 'z' \| 'x', `thick` 0.5, `parts` [{ u, v, w, h, color, a }], `turn` 0, `time` 0.9, `items` [{ kind, u, v, a } \| { star, u, v, a }], `schalter` { pos, id, color }, `onTurn`, `color` 'holz' \| 'birke' → `{ turn, turning, turns, toggle(), start(), info() }` | `{ type: 'walzenraum', id: 'raum', pos: [0, 4, -139], radius: 4, length: 8, parts: [{ u: 0, v: -2.5, w: 3, h: 0.5 }], schalter: { pos: [6, 0, -131], id: 'raumknopf' } }` |
| `draufsicht` | Kamera senkrecht von oben (89,5°) im Bereich, weich überblendet; Steuerung: oben = −Z | `area` [x0, z0, x1, z1] \| `whole`, `height` 24, `fov` 42, `blend` 6, `yaw` 0, `ahead` 1.5, `lead` 0.5 → `{ area, weight(x, z), info() → { weight, pitch } }` | `{ type: 'draufsicht', id: 'oben', area: [-16, -242, 16, -270] }` |
| `waben` | Sechseck-Feld: normal, Lava (Treffer + hochschleudern; `damage: 'tod'`), Eis (glatt), hoch (+rise) | `pos` (Oberseite Zeile 0/Spalte 0), `size` 1.6, `height` 0.6, `map` ['nnl', ' iin' …] (n, l, i, h, ' '/'.'), `gap` 0.06, `rise` 1, `damage` 'treffer' \| 'tod', `color` (eigene Optik) → `{ cells [{ q, r, type, x, y, z }], at(x, z), hits, info() }`; Tags `wabe`, `wabe-lava`, `wabe-eis` | `{ type: 'waben', id: 'feld', pos: [-6, 0, -40], map: ['nnnn', 'nlin', 'nnnn'] }` |
| `nebelplattform` | Platten steigen/sinken im Takt aus dem Nebel (`heben`, tragen mit) oder erscheinen/verschwinden (`blinken`) | `pos` (Oberseite oben) \| `parts` [{ pos, size, phase, up, down }] \| `from`/`to`/`n`, `size` [2.6, 0.5, 2.6], `mode` 'heben' \| 'blinken', `depth` 3, `up` 2.6, `down` 2, `move` 1.1 (blinken 0.3), `warn` 0.7, `phase`, `stagger` 1.1, `fog`, `idle` → `{ parts [{ state, k, solid, mb }], start(), stop(), info() }`; Tag `nebelplattform` | `{ type: 'nebelplattform', id: 'nebel', from: [0, 0, -281], to: [0, 0, -305], n: 5, depth: 3 }` |
| `nebelboden` | dichter Bodennebel mit Absturz darunter, optional erscheinende Bodenstücke | `pos` (y = Nebeloberfläche), `size` [w, d], `depth` 1.5, `kill` 'fall' \| 'gift' \| false, `density` 0.6, `color`, `layers` 3, `height` 1.2, `parts` [{ pos, size, up, down, phase }], `warn` 0.7 → `{ surface, parts, info() }`; Tag `nebelboden` | `{ type: 'nebelboden', pos: [0, -0.6, -293], size: [26, 32], parts: [{ pos: [-6, -0.4, -284], size: [3, 0.4, 3] }] }` |
| `schienenbrett` | Brett fährt auf einem Schienennetz von Knoten zu Knoten; an Weichen der eingestellte Abzweig; Ende halt/fallen (respawn). Weichen: Treffer von Kanonenkugel, Wurfsichel, Panzer, Feuer, Tatze, Stampfen, Bombe (Sperre `cool`) | `nodes` { A: [x, y, z] … } (Schienen-Oberkante), `rails` [['A', 'B'] …], `start`, `next`, `weichen` { B: { to: ['C', 'D'], state 0, pos, id, cool 0.9, look } }, `speed` 5, `size` [2.6, 0.35, 2.6], `go` 'stand' \| 'auto' \| 'signal', `wait` 0.3, `end` 'fallen' \| 'halt', `respawn` 3, `posts` 0, `onRespawn` → `{ state 'ruhe'\|'wartet'\|'faehrt'\|'ende'\|'faellt'\|'weg', from, to, u, route, weichen { B: { state, to, hits, pos, toggle() } }, mb, start(), stop(), reset(), info() }`; Weiche benannt `${id}:${Knoten}`; Tags `schienenbrett`, `weiche` | `{ type: 'schienenbrett', id: 'brett', nodes: { A: [0, 0.2, -316], B: [0, 0.2, -327], C: [-3.6, 0.2, -337], D: [3.6, 0.2, -337] }, rails: [['A', 'B'], ['B', 'C'], ['B', 'D']], weichen: { B: { to: ['C', 'D'] } } }` |
| `kanonenkugel_wand` | gestaffelte Kanonen schießen langsame, große Kugeln quer; Kugeln = tragende Trittstufen, weg nach `range` | `pos` (Fuß der untersten Kanone), `dir` [1, 0], `rows` 6, `rise` 2.2, `step` [0, 0, 0], `range` 14, `speed` 3, `period` 3.2, `stagger` 0.55, `phase`, `size` 1.4, `idle` → `{ balls, shots, start(), stop(), info() }`; Tag `kanonenkugel` | `{ type: 'kanonenkugel_wand', id: 'kugeln', pos: [-9, 0.6, -366], rows: 5, rise: 2.1 }` |
| `drehdiorama` | Diorama-Teile drehen per Schalter in 90°-Schritten um eine senkrechte Achse (Figuren, Items, Sterne drehen mit); Sterne mit `sicht` nur aus einer Blickrichtung bzw. Stellung sichtbar/einsammelbar | `pos` (Drehpunkt, y = Unterkante), `parts` [{ pos (relativ, Mitte Unterseite), size, color, top, climbable }], `turn` 0, `time` 1.2, `dir` 1, `schalter` { pos, id, color } \| [...], `items` [{ kind, pos } \| { star }], `sicht` [{ star, yaw: [a, b] (Grad) \| turn: [...] }], `onTurn`, `disc` { radius, height, color }, `gear` true → `{ turn, turning, turns, angle, toggle(), start(), visible(star), info() }`; Tag `drehdiorama` | `{ type: 'drehdiorama', id: 'diorama', pos: [0, 0, -388], disc: { radius: 5.5 }, parts: [{ pos: [0, 0, -3], size: [8, 1.2, 1.4] }], schalter: { pos: [8, 0, -377] }, sicht: [{ star: 'blickstern', yaw: [100, 180] }] }` |
| `sternenglanz` | Belohnung: Kostüm im Spielstand freischalten (`courseSave.data.outfits[outfit] = { from, at }`, additiv), Ansage, Funkeln | `outfit` 'stern', `when` 'ziel' \| 'sofort' \| 'signal' (Signal `sternenglanz` bzw. start()), `banner` Text \| false → `{ outfit, unlocked, isNew, fired, start(), info() }` | `{ type: 'sternenglanz', id: 'glanz', when: 'ziel' }` |
| `fliegender_zielmast` (kind) | Zielmast mit Flügeln fliegt seinen Pfad, solange eine Figur nah ist (sonst schwebt er und wartet), landet am Ende; Fangen = Ziel (Greifhöhe zählt) | `pos` (Fuß), `path`, `height` 9, `speed` 6.5, `near` 11, `far` 24, `start` 'nah' \| 'auto' \| 'signal', `trigger` 9, `mode` 'flucht' \| 'pendel', `land`, `bob` 0.35 → `{ state 'wartet'\|'fliegt'\|'schwebt'\|'gelandet'\|'gefangen', s, dist, start(), info() }` | `{ kind: 'fliegender_zielmast', id: 'flugmast', pos: [4, 0, -164], path: [[4, 3, -176], [-4, 3, -188], [-7, 0, -199]], start: 'signal' }` |
| `scheinziel` (kind) | sieht aus wie ein Zielmast; Berühren → Aktion, Signal, startet `mast`; fliegt davon (`fluegel`) oder verpufft (`poff`) | `pos`, `height` 9, `onTouch`, `mast` id, `mode` 'fluegel' \| 'poff' → `{ touched, info() }` | `{ kind: 'scheinziel', id: 'schein', pos: [0, 0, -156], mast: 'flugmast' }` |
| `felsblock` (kind) | fest; Stampfen/Tatze/Feuer prallen ab; Bombe, Kanonenkugel, Riesentrank sprengen → Inhalt/Aktion | `pos` (Mitte Unterseite), `size` 2.4 \| [w, h, d], `look` 'fels' \| 'wand' \| 'eis', `by` ['bomb', 'cannon', 'mega'], `content`, `onBreak`, `hidden` → `{ broken, by, info() }` | `{ kind: 'felsblock', id: 'felswand', pos: [-5, 0, -230], size: [4, 3, 1.2], look: 'wand', content: { star: 1 } }` |
| `riesen_frageturm` (kind) | Riesen-?-Block wächst beim Anschlagen zu einem Turm; wer oben steht, fährt mit; je Block Münzen, oben der Inhalt | `pos`, `size` 2, `blocks` 4, `delay` 0.22, `coins` 1, `content`, `onGrow`, `trigger` ['bump', 'pound', 'throw', 'shell', 'bomb', 'mega', 'cannon'], `color`, `hidden` → `{ state 'bereit'\|'waechst'\|'turm', grown, top, grow(), info() }` | `{ kind: 'riesen_frageturm', id: 'turm', pos: [-5, 2.6, -214] }` |
| `laufbombe` (kind) | = Kickbombe (Verhalten unverändert, sprengt Felsblöcke) mit Modell `laufbombe` | Felder der Kickbombe | `{ kind: 'laufbombe', id: 'bombe', pos: [1, 0, -218], dir: [1, 0], speed: 0 }` |
| `deco_star` | Kulisse (verschmolzen bzw. Registry-Modelle gebacken) | `items` [{ kind, pos, yaw, scale, solid, shadow, look, variant … }]; Arten: planet, stern, sterne, rakete, kristall, komet, regenbogen, holzkiste, holzbalken, walzenstapel, riesenblock, retro_wolke, retro_busch, roehre_deko, wabe, honigtopf, riesenpflanze, riesenpilz, riesenblume, liane, grabstein, kahler_baum, schneehuegel, laterne, irrlicht, antenne, neonring, leuchtsaeule; nur als Modell: kuppel, torbogen, regenbogenweg, walzen_schiene, brett_schiene, nebelbank; modell ({ name, opts, state }) | `{ type: 'deco_star', items: [{ kind: 'planet', pos: [-12, 6, -20], radius: 3, variant: 'pilz' }, { kind: 'rakete', pos: [9, 0, -4] }] }` |

Hinweise für Level-Bauer: Drehplatten-Boost-Strecken mit `delay` 0,25 und Pfeil – wer rennt, ist weiter, bevor sie kippen.
Plattenwand: die Wand ist mindestens `depth + 0,1` m tief (Rückseite nicht begehbar planen). Schienenwalze: Achse liegt
`radius + 0,2` über der Schienen-Oberkante (Modell-Räder); Pfad = Achsmitte. Schienenbrett: Deck-Oberseite 0,62 m über den
Knoten (Modell); die **Weiche** nutzt das Modell, wenn genau zwei Abzweige links/rechts im Winkel der Modell-Äste liegen
(8°–34° zur Zulaufrichtung, ≥ 5,1 m voraus; z. B. Knoten 10 m voraus und 3,6 m seitlich) – dann sitzt die Zielscheibe am
Signalmast links neben der Weiche (`weichen.B.pos` entfällt; Treffer an Mast oder Scheibe); sonst eigene Scheibe auf Pfosten
bei `pos`. Drehdiorama: Teile in Stücke ≤ max(1,2 m, Breite) zerlegt (Kollision während der Drehung). Blick-Sterne: Gier in
Grad wie die Kamera (0 = Kamera bei +Z, positiv = Kamera nach +X). Draufsicht-Level: Thema `honeycomb` (Sterne auch unten).

### Präzisierung (Motor und Bausteine Bonuswelten): Signale, Zustände, Schnittstellen

- **Signale** (`level.signal(name, data)`): `zeituhr` { sec, got, pos }, `farbplatten` { id, count, of }, `weiche` { id, node,
  state }, `drehdiorama` { id, turn }, `kostuem` { name, from, isNew }, `scheinziel` { id, pos }, `zielmast_gefangen` { id, s,
  frac }, `felsblock` { id, by, pos }, `frageturm` { id, via, top }. Gehört wird `sternenglanz` (when 'signal').
- **Sammelstelle** `star(level)` (blocks/starkit.js): { clocks, plates, colors, walls, rollers, drums, poles, towers, topdown,
  combs, fogs, boards, cannons, dioramas, rocks, rewards } – z. B. für Gegner, die Kanonenkugeln oder Walzen abfragen.
- **Kostüme** (Karten- und Figuren-Agent): `courseSave.data.outfits = { stern: { from: 'S-2', at } }` (additiv); Hilfen
  `unlockOutfit(name, from)`, `hasOutfit(name)`, `outfits()` in blocks/starkit.js; die Figur-Gestaltung liest den Namen.
- **Schnittstellen für Level-Agenten**: Remix-Dateien nur über `remixOf` (keine Kopien); Stern-Level nutzen die Themen unten
  (`theme: 'galaxy'` …) und die Bausteine; `?theme=<thema>@<licht>` zum Ansehen. Musik-Variante nur über `music` (Regel).
- **Schnittstellen für Gegner-Agenten**: `replaceKind` ersetzt auch Laufzeit-spawns (eigene Gegner-Arten wirken sofort in
  Remixen); `level.spawn('felsblock' | 'riesen_frageturm' | … )`; Kanonenkugel-Treffer an Stern-Bausteinen über
  `owner.onHit('cannon')`.
- **Schnittstellen für Karten-Agenten**: Karten können die Stern-Themen als `theme` setzen (z. B. `starspace`), die
  Licht-Varianten (`starspace@nacht`) ebenso; Remix-Level erscheinen über ihre Platzhalter-Daten (`id`, `world`, `title`)
  in der Registry, ohne dass die Basis geladen werden muss.
- **Klänge** (vorhandene Effekte): Drehplatte `flip`, Farbplatten `switch`/`key`/`alarm`, Plattenwand `flip`, Walze
  `rumble`/`fall`, Walzenraum `rumble`/`slam`, Drehdiorama `chain`/`rumble`/`slam`, Weiche `switch`, Brett `rumble`/`chain`/
  `fall`, Kanonen `cannon`, Zeit-Uhr `coin`/`timewarn`, Sternenglanz `powerup`, Felsblock `brickbreak`/`slam`/`bump`, ?-Turm `blockhit`/`powerup_appear`, Scheinziel `pfiff`/`swoop`, Zielmast
  `swoop`/`land`, Lava-Wabe `burn`. `tests/sfx_namen.mjs` prüft sie.

### Präzisierung (Motor und Bausteine Bonuswelten): Themen

Registriert in `view/themes.js` (`??=`); Kulissen aus `view/backdrop_star.js` (verschmolzen/unbeleuchtet, Bewegtes als wenige
Objekte; Sternenkugel auch unterhalb des Levels).

| Thema | Name | für | Kulisse und Licht |
| --- | --- | --- | --- |
| `starspace` | Sternenzelt | Welt Stern (Grundthema, Karte) | tiefblauer Sternenhimmel rundum, Pastell-Nebel, Ringplaneten, Sternschnuppen, kleine Planetoiden; lavendel-weiße Decken |
| `rainbow` | Regenbogenweg | S-1 | Nachtblau/Violett, zwei Regenbogen-Bögen, Sterne, Sternschnuppen, Wattewolken tief unten |
| `galaxy` | Planetoiden | S-2 | rosa-goldene Sternenwirbel-Wolke, viele Planetoiden mit Grashaube/Bäumchen/Ringen; Grasdecken über lila Erde |
| `woodspace` | Holz-Athletik | S-3 | blaugrüner Weltraum, großer Mond, treibende Holzbalken/Kisten/Walzen; warmes Holz |
| `blockland` | Riesenblockland | S-5 | Taghimmel, Wiese tief unten mit bunten Riesenblöcken, runde Hügel, Retro-Wolken; Raster-Grasdecken |
| `honeycomb` | Waben-Sternenweg | S-6 (Draufsicht), B-10 mit `@tag` | Sterne rundum auch unten, leuchtendes Wabengitter tief unten, Honig-Lichter |
| `grotto` | Riesengrotte | S-7 | Blätterdach-Licht, Dschungeldunst, Riesenbäume/-pilze/-blätter, Lianen; Unterwasser klares Türkis |
| `fogbog` | Nebelfriedhof | S-8 | Winternacht, dichter heller Nebel (nah), Schneefall, Grabsteine, kahle Bäume, Laternen, Irrlichter; Figurenlicht |
| `cosmic` | Kanonen-Kosmos | S-9 | Violett-Schwarz, Neon-Raumstation (Ringe, Türme, Lichtstrahlen), cyan Gasplanet; helles Metall |
| `bossblitz` | Blitz-Arena | B-12 | Nacht-Weltraum-Arena, großer Mond, Lichtmasten mit Scheinwerfer-Kegeln; kräftiges Randlicht |

Licht-Varianten (`view/themeVariants.js`, Remix-Regel `light` bzw. `?theme=`): `nacht` (Mond, Sterne, kühles Mondlicht mit
Schatten, sanftes Figurenlicht), `abend` (Sonnenuntergang Lila–Rosa–Orange), `morgen` (Morgenrot, weiches Licht), `tag`
(Taghimmel; Weltraum-Kulissen entfallen), `dunkel` (fast schwarz, naher Nebel, kräftiges Figuren- und Laternenlicht); Gelände-
Farben werden in die Lichtfarbe gezogen, die Kulisse des Grundthemas bleibt (gedämpft/getönt).

### Präzisierung (Motor und Bausteine Bonuswelten): Modelle

| Baustein | Registry-Modell | Abbildung |
| --- | --- | --- |
| drehplatte | `drehplatte` (Instanz-Variante) | size [w, d], thick = h, axis gleich, color/back; state tilt = k·90°, shake in der Vorwarnung |
| farbplatten | `farbplatte` (Instanz-Variante) | colors [from, to], state color 0 → 1 (weich), flash beim Betreten, pulsiert nach dem Abschluss |
| plattenwand | `plattenwand` (ModelSet: alle Platten einer Wand = 2 Zeichenaufrufe) | size [Plattenbreite, plate], depth; out = k; Vorwarnung zittert |
| waben | `wabe` (Instanz-Variante je Art) | size = Eckradius − gap/2, thick = height, um 90° gedreht (Ecke ±Z), hoch = gestreckt; press unter stehenden Figuren |
| nebelplattform / nebelboden-Teile | `nebelplattform` (ModelSet) | size [w, d], thick; blinken = schrumpfen/flackern; ganz unter der Nebeldecke nicht gezeichnet |
| kanonenkugel_wand | `kanonenkugel_tritt` (ModelSet, nur fliegende Kugeln gezeichnet) | size = Kugel, Blick in Flugrichtung |
| schienenwalze | `schienenwalze` + `walzen_schiene` (gebacken je Pfad-Abschnitt, auch geneigt) | radius, length; angle = Rollen; Schienen gauge = length, Prellböcke bei end halt/zurück |
| schienenbrett | `schienenbrett`, `brett_schiene` (gebacken), `weiche` (wenn sie passt) | Brett blickt in Fahrtrichtung, speed/fall; Weiche dir = Abzweig, hit = Treffer |
| drehdiorama (disc) | `diorama_drehscheibe` | radius, height, teeth ≈ 9·radius; angle |
| fliegender_zielmast, scheinziel | `zielmast_fluegel` (Scheinziel bis zur Berührung `goal_pole`) | fly 0 / 0,75 / 1, flagY; blickt in Flugrichtung |
| riesen_frageturm | `riesen_frageblock_turm` (kopf + segmente) | Kopf oben bei k·size, Segmente out = Wachstum |
| felsblock | `felsblock_riss` (fels, wand) | size [w, h, d], break 0 → 1 in 0,9 s nach dem Sprengen |
| laufbombe | `laufbombe` | Zustände der Kickbombe übersetzt (walk, fuse, carried, thrown) |
| deco_star | planet { kind }, spielzeugrakete, sternschnuppe, retro_block, retro_wolke, retro_busch, wabensaeule, riesenpflanze, schneegrab, weltraum_antenne, weltraum_kuppel, sternen_torbogen, regenbogenweg, walzen_schiene, brett_schiene, nebelbank | gebacken (nebelbank bewegt) |

Eigene Optik bleibt für: zeituhren, walzenraum, draufsicht, nebelboden-Fläche, Kanonen, Boost-Pfeile und die übrigen
Kulissen-Arten (kein passendes Modell).

### Präzisierung (Motor und Bausteine Bonuswelten): Tests und Kennzahlen

`tests/course_star_blocks.mjs` (nach `npm run build`; je Teil < 10 min): **remix** 18 Prüfungen (Platzhalter/Registry, Nacht-
Beleuchtung, replaceKind auch für Laufzeit-spawns, remove/change/stars/stamp, Musik-Variante im Musiksystem, Gegenprobe Basis
unverändert, Basis-Änderung wirkt mit, Zeit-Uhr mit Gegenprobe, keep mit gefilterten Basis-Haken, Gegenprobe 2-4, Zeitdruck mit
und ohne Uhr, Schwarz-Weiß-Filter samt Ende, beepSpeed/beepWarn mit Gegenprobe 4-3, replace/replaceType/move/in 'deco',
Licht-Varianten, Kennzahlen, Konsole); **mech** 33 Prüfungen (jede Mechanik mit Gegenprobe, Hüllen als kind, Registry-Modelle
mit Gegenprobe `look: 'eigen'`); **themes** 4 Prüfungen (zehn Themen mit Bildern und Rundblick). Kennzahlen (Zeichenaufrufe
inkl. Schattenpass / Dreiecke) in der Werkstatt: Start 52 / 118 k, Drehplatte 47 / 118 k, Farbplatten 35 / 65 k, Plattenwand
34 / 130 k, Schienenwalze 22 / 86 k, Walzenraum 43 / 111 k, Flug-Zielmast 77 / 199 k, ?-Turm 79 / 245 k (zwei Türme, Fels,
Laufbombe, Wabenfeld im Blick), Draufsicht/Waben 33 / 137 k, Nebel 42 / 149 k, Schienenbrett 38 / 119 k, Kanonenkugeln
48 / 166 k, Drehdiorama 63 / 148 k; Themen ≤ 65 / 177 k; Remixe ≤ 77 / 193 k. Grenzen < 120 / < 300 k.
