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
| schnappblume | schnappt im Takt (Reichweite) | Feuer, Krallen, Sturzflug, Panzer, Explosion, Stampfen **neben** ihr (auf einer Röhre: Tatzenhieb im Sprung, Stampfen neben einer Röhre ≤ 1,2 m) | von oben und Biss |
| riesenschnappblume | wie oben, großer Radius | dasselbe, 3 Treffer (1,1 s Pause) | von oben und Biss |
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
  // Schnappblume: base 'pot'|'ground'|'pipe' ('pot'), yaw (Ruhe-Blick), range 3.4, reach 1.35, pause 0.7, hp 1
  { kind: 'schnappblume', pos: [4, 2.2, -70], base: 'pipe', yaw: -Math.PI / 2 },   // auf einer Röhre (Höhe 1,2)
  // Riesenschnappblume: base 'ground', range 7, reach 3.3, pause 0.9, hp 3
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
