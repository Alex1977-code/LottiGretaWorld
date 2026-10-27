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
