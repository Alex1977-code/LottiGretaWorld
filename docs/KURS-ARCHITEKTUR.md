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
  Gerüst `funken` (wirft Entität `fireball`, sobald es sie gibt), `riese` (10 s, ×2,4, zerbricht/besiegt),
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
