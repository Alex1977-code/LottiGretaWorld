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

**Neue Effekte** (`sfx(name)`): `clone`, `clone_lost`, `helm_on`, `helm_off`, `cannon`, `propeller`, `light`, `quicksand`, `sand_crumble`, `peck`, `bullet`, `boss_hit`, `boss_spin`, `house_tick`, `room_clear`, `ice_slide`, `snowball`, `ghost`, `splash_big`, `train_whistle`, `beep`, `beep_switch`.

**Taktuhr** (für Piep-Blöcke u. ä.):
- `music.beat()` → `{ bpm, beat, bar, phase, playing, inBar, theme, loopBeats, source }` – `beat` = fortlaufende Viertel seit Themenstart (Kommazahl, fällt nie), `bar = floor(beat/4)`, `phase` 0..1, `inBar` 0–3, `source` `'audio'|'ersatz'|'none'`. Ohne Thema `bpm 0`, `playing false`.
- `music.onBeat(fn)` → Abmelden-Funktion; `fn({ beat, bar, inBar, bpm, theme, late })` einmal je ganzer Zählzeit, synchron zur **hörbaren** Musik (Ausgabelatenz berücksichtigt). Ersatzuhr über `performance.now()`, solange Audio nicht freigeschaltet/angehalten ist; Stummschalten ändert die Uhr nicht.
- Themenwechsel setzt `beat` auf 0 zurück → in Piep-Levels die Musik nicht wechseln (z. B. kein Funkelstern-Thema) oder eigene Phase führen.
- `themeInfo('course_beep').sync = { switchEvery: 8, warnBeats: 3 }`: Umschalt-Piep auf Zählzeit 0, 8, 16 …, Warn-Pieps auf den Zählzeiten 5, 6, 7 jedes Achterblocks.
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
