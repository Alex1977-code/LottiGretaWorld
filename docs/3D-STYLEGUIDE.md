# 3D-Styleguide – Lotti & Greta im Super-Mario-3D-World-Look

Ziel: Welt und Figuren sind echte 3D-Objekte (Three.js), die Spielweise bleibt ein Side-Scroller.
Vorbild in der Anmutung: Super Mario 3D World – weich schattierte, glatte Formen, kräftige, saubere
Farben, runde Kanten, klare Silhouetten, spielzeughafte Materialien (matt-glänzend), weiche Schatten,
sonniges Licht. Keine Pixel, keine harten Outlines, keine Texturen mit Rauschen – Form und Farbe
tragen alles.

## Architektur (nicht verhandelbar)

- Spiellogik: Phaser Arcade, 480x270 Weltpixel, 16-px-Tiles. **Unverändert.**
- `src/three/View3D.js`: eigene WebGL-Leinwand `#gl3d` unter der transparenten Phaser-Leinwand
  (HUD, Touch-Steuerung, Menüs bleiben in Phaser). Kamera folgt `cameras.main.worldView`.
- Koordinaten: **1 Einheit = 1 Tile = 16 px.** `X = px / 16`, `Y = -py / 16`, Spielebene `Z = 0`.
  Helfer: `toX`, `toY`, `U` aus `View3D.js`.
- Kamera: Perspektive, `RENDER3D.fov` 30°, blickt um `RENDER3D.tilt` (12°) von oben auf die
  Spielebene; Abstand so, dass bei Z = 0 genau 270 px Höhe sichtbar sind (`src/render3d.js`).
- Jedes Phaser-Sprite der Play-Szene bekommt über seinen Textur-Key einen **Avatar**
  (`src/three/avatars/index.js`). Der Avatar liest den Zustand des Sprites und baut/animiert ein
  Three.js-Modell. Phaser zeichnet das Sprite nicht mehr (`camera.ignore`), Physik und Animation
  laufen weiter.
- Die Welt (`src/three/world/World3D.js`) entsteht aus der Logik-Tilemap (`groundLayer`).
- Effekte (`src/three/Effects3D.js`) haben dieselbe Schnittstelle wie `systems/Effects.js`.
- `?r3d=0` schaltet auf die 2D-Darstellung zurück; die muss weiter funktionieren.

## Avatar-Vertrag (`src/three/Avatar3D.js`)

```js
class MeinAvatar extends Avatar3D {
  buildModel() { /* Meshes in this.model hängen; Geometrien/Materialien mit this.track(...) vormerken */ }
  animate(dt, t) { /* je Frame: Posen, Drehungen; dt in s, t Sekunden seit Start */ }
}
```

- Ursprung von `this.root` = **Fußpunkt** der Figur (Unterkante des Phaser-Frames). Modelle stehen
  auf `y = 0` und blicken nach **+X** (rechts). Die Blickrichtung (`flipX`) wird von der Basisklasse
  als weiche Y-Drehung von `this.model` gesetzt (`turnSpeed`, 0 = sofort). Figuren drehen sich also
  wirklich um – im Umdrehen sieht man kurz das Gesicht von vorn (gewollt, wie im Vorbild).
- Die Basisklasse übernimmt außerdem `angle` (Neigung) und Squash & Stretch (`scaleX/Y` des Sprites)
  und blendet bei Blinken (Unverwundbarkeit) hart aus. Schalter: `usesFacing`, `usesAngle`,
  `usesSquash`, `zOffset`.
- Größen: Heldin 24 px hoch = **1,5 Einheiten**; Pflaume 24x20 px = 1,5 breit, 1,25 hoch;
  Gegner 16 px = 1 Einheit; Münze ≈ 0,75 Einheiten Durchmesser. Hitboxen bleiben in Phaser –
  das Modell darf etwas größer sein als die Hitbox, aber Fuß- und Kopfhöhe sollen stimmen.
- Zustände lesen, nicht raten: `obj.frame.name` (`this.frameName`), `obj.body.velocity`, und die
  entitäts-spezifischen Felder (siehe Kommentare in `avatars/*.js`). Keine Spiellogik im Avatar.
- Leistung: pro Avatar ≤ ~30 Meshes, Geometrien niedrig aufgelöst (Kugeln 16x12 reichen),
  Materialien möglichst **modulweit teilen** (Cache), nur avatar-eigene Dinge `track()`-en.
  Ziel: 60 fps auf einem Mittelklasse-Handy, Gesamtszene < 60 Zeichenaufrufe.
- Schatten: `castShadow = true` für Körper, keine Schatten auf Kleinteilen (Augen, Glanz).
- Animation ist **prozedural** (Sinus-Läufe, Zielposen mit `damp`), keine Frame-Sequenzen.

## Welt-Vertrag (`src/three/world/World3D.js`)

- `new World3D(view, map, groundLayer)`, `removeTile(tx, ty)` (Block zerbrochen), `update(dt, t)`,
  `dispose()`. Tile `(tx, ty)` deckt `X ∈ [tx, tx+1]`, `Y ∈ [-(ty+1), -ty]` ab.
- Tile-Arten: Boden (Index 0–15, Bitmaske `EDGE` TOP=1 RIGHT=2 BOTTOM=4 LEFT=8 = freie Kanten),
  `platform` 16 (einseitig, dünner Steg), `brick`/`brickAlt` 17/18 (zerbrechlich), Zier 19–22
  (Grasbüschel, Blumen, Pilze, Stein – ohne Kollision), `caveFloor` 23 (Boden in der Höhle).
- Die Spielebene liegt bei Z = 0 **vorn-mittig** auf dem Boden: Boden reicht nach hinten (Tiefe
  mehrere Einheiten) und ein kleines Stück nach vorn, Grasdecke oben, Erd-/Felskante vorn sichtbar.
  Blöcke und Plattformen sind eigenständige Körper um Z = 0.
- Unter dem Level und seitlich darüber hinaus weiter Boden, damit am Rand nichts „abbricht“.
- Hintergrund in echter Tiefe (Z < −6): Hügel, Bäume, Wolken, Sonne, Himmelsverlauf – die Parallaxe
  entsteht durch die Perspektive von selbst. Leichter Nebel für Tiefe.
- Licht: warmes gerichtetes Sonnenlicht mit Schatten (Schattenkamera folgt `view.target`),
  Hemisphärenlicht für weiche Füllung. Keine dunklen, schmutzigen Farben.

## Prüfen

- `npm run build && node tests/three.mjs` → Screenshots `tests/out/t0*.png`, Kennzahlen, keine Konsolenfehler.
- Logik-Tests laufen weiter in 2D (`r3d=0`): `node tests/run.mjs`, `tests/pflaume.mjs` usw.
- Sichtkontrolle: Screenshots ansehen (gern eigene Posen über `page.evaluate` erzwingen).
