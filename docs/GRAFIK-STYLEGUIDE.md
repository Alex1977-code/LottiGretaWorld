# Grafik-Styleguide „Lotti & Greta“ – 3D-World-Look

Ziel: moderner, glatter, spielzeughafter Look wie bei aktuellen 3D-Jump'n'Runs (Vorbild in der
Anmutung: Super Mario 3D World – **eigene Entwürfe, keine Nintendo-Figuren, -Objekte oder -Namen
nachbauen**). Keine Pixel-Art mehr: Alles wird als **Vektorgrafik mit dem Canvas-2D-Kontext**
gezeichnet (Pfade, Kurven, Verläufe) und in `RENDER.scale`-facher Auflösung (2–3x) gerastert.

## Look

- **Formen:** rund, prall, klar. Kreise, Ellipsen, abgerundete Rechtecke, weiche Bézier-Kurven.
  Figuren: großer Kopf (ca. 45–50 % der Höhe), kurze Gliedmaßen, große glänzende Augen
  (Weiß, farbige Iris, Pupille, Glanzpunkt), kleine Nase/Mund, Wangenrot.
- **Volumen durch Licht:** Licht von **oben links**. Jede Form bekommt einen weichen Verlauf
  (radial oder linear) von Lichtton nach Schatten, einen weißen Glanzpunkt oben links
  (`rgba(255,255,255,0.5–0.8)`) und einen weichen Kernschatten unten rechts (dunklerer Ton
  derselben Farbe, kein Grau). Unter Objekten ein weicher Bodenschatten (dunkle Ellipse, Alpha 0.2–0.3).
- **Konturen:** keine harten schwarzen Outlines. Wo Trennung nötig ist: dünne Linie (0.5–0.8 px)
  in einem dunklen Ton der Grundfarbe mit Alpha 0.3–0.5.
- **Farben:** satt und freundlich, viel Kontrast zwischen Vorder- und Hintergrund.
  - Himmel `#5cc2ff` → `#bfe9ff`, Wolken weiß mit Schatten `#dbeeff`
  - Gras `#7ee04f` Licht / `#4fb833` Grund / `#2f8a24` Schatten · Erde `#e2a35c` / `#c17a3a` / `#8a4f22`
  - Holz `#e0a865` / `#b97a3f` / `#7d4d22` · Stein `#e3e4ea` / `#b9bbc6` / `#7f8290`
  - Gold `#ffe066` / `#ffc21a` / `#c98700` · Rot `#ff6b5e` / `#ff3b2f` / `#b3221a`
  - Blau `#6ea4ff` / `#3a7bff` / `#1f4fbf` · Grün `#8fe06a` / `#4fb833` / `#2f8a24` · Lila `#d5a6ff` / `#b06ee8` / `#7a46b0`
  - Haut `#ffe3c7` / `#ffd0a8` / `#e0a67c` · Dunkelblond `#e0b45a` / `#c6933f` / `#8f6424` · Hellblond `#fff1a8` / `#f6dc74` / `#cfae44`
- **Hintergrund:** weicher, heller, leicht entsättigt (Luftperspektive), keine Konturen; Vordergrund
  (Tiles, Figuren) hat die kräftigen Farben und die klaren Formen.
- **Lesbarkeit:** Silhouetten müssen auch in 1x (480x270 Weltpixel) klar sein; Details nur so fein,
  dass sie bei 2–3x Auflösung noch sauber wirken.

## Zeichen-API (muss eingehalten werden)

Jedes Sprite-Modul exportiert `SHEETS = [{ key, frameWidth, frameHeight, draw, variants? }]`.
- `draw` = Objekt `{ frameName: (g) => void }`. `g = { ctx, w, h, S, colors }`:
  `ctx` ist ein Canvas-2D-Kontext, **bereits auf Weltkoordinaten skaliert** (0..w, 0..h sind Weltpixel,
  Ursprung oben links, Bruchzahlen erlaubt), auf das Frame-Rechteck geclippt, `lineJoin/lineCap = round`.
  `S` ist die Render-Skalierung (nur nötig, wenn etwas pixelgenau sein soll). Zustand nicht leaken
  (`ctx.save()/restore()` um eigene Transformationen).
- `variants` (optional) = `{ suffix: { Z: '#...', z: '#...' } }` → erzeugt Frames `<name>_<suffix>`; die
  Farben kommen als `g.colors` (z. B. `g.colors.Z` Grundton, `g.colors.z` Glanz). Bei Pflaume und Beere
  sind das die Kraft-Farben aus `POWER_COLORS` (`src/gfx/palette.js`, nicht ändern).
- Hilfsfunktionen (Verläufe, Kugeln, Augen …) im Modul selbst definieren; keine externen Bilder/Fonts.
- Referenzbeispiel: `src/gfx/sprites/leaf.js`.

| Sheet | Frame (Weltpixel) | Frames (Namen fest) | Ausrichtung / Hitbox |
| --- | --- | --- | --- |
| `lotti`, `greta` | 24x24 | idle0, idle1, run0–run3, jump, fall, glide, ride, dive | blickt nach **rechts** (links wird gespiegelt), Füße auf der Unterkante; Hitbox 10x14 mittig unten (x 7–17, y 10–24); Kopf/Haare dürfen hinausragen |
| `pflaume` | 24x20 | idle0, idle1, walk0, walk1, panic, fly (+ Varianten über `variants`) | blickt nach rechts, Füße unten; Hitbox allein 14x12 mittig unten; beim Reiten liegen die Füße der Heldin auf y = 8 – dort muss der Rücken/Panzer als Sitzfläche lesbar sein |
| `leaf` | 22x12 | leaf0, leaf1 | Blätterschirm, Stiel unten mittig |
| `walker` | 16x16 | walk0, walk1, squashed | Laufkäfer, blickt rechts, Hitbox 12x9 unten (y 7–16) |
| `hopper` | 16x16 | idle, squat, jump, squashed | hüpfender Pilz, Hitbox 12x14 unten (y 2–16) |
| `coin` | 12x12 | coin0–coin3 (Drehung) | große Sammelmünze |
| `coin_hud` | 8x8 | full, empty | HUD |
| `key` | 12x12 | key | |
| `gate` | 16x32 | closed, open | Tor, steht auf dem Boden (Unterkante) |
| `flag` | 16x32 | flag0, flag1, flag2 | Zielfahne, Stange unten |
| `thorns` | 16x8 | thorns | Dornen, liegen am Boden |
| `checkpoint` | 16x32 | off, on | Pfosten mit Fahne |
| `heart` | 8x8 | full, empty | HUD |
| `berry` | 8x8 | berry (+ Varianten) | |
| `fireball` | 8x8 | fire0, fire1 | |
| `tiles` | 16x16 | `drawTile(ctx, name, ox, oy)` in Weltpixeln; Index 0–15 Boden-Autotile (Maske oben=1, rechts=2, unten=4, links=8 = freiliegende Kante), 16 Plattform (einseitig, obere ~6 px), 17/18 Steinblock, 19–22 Zier (Gras, Blumen, Pilze, Stein), 23 Höhlenboden | Reihenfolge/Indizes fest (`TILE_NAMES`, `TILE_INDEX`), weitere nur anhängen; Tiles müssen nahtlos aneinanderpassen |
| Hintergrund | `createBackgroundTextures(scene, w, h)` in `src/gfx/background.js` | Texturen `sky` (fest), Parallax-Ebenen aus `PARALLAX_LAYERS` (Key, fx, fy, depth, bands), `worldmap_bg` | direkt in `RENDER.scale`-facher Auflösung zeichnen (Canvas `w*S` x `h*S`, `ctx.scale(S,S)`), kachelbar in X; Ebenen dürfen höher als 270 sein (vertikales Parallax) |

Sheet-Keys, Frame-Namen und Frame-Größen nicht ändern – der Code verlässt sich darauf.
Kommentare auf Deutsch, kurz.

## Prüf-Workflow

```bash
node tools/check-frames.mjs                                  # Pflicht-Frames, Zeichenfunktionen laufen fehlerfrei
npm run build && node tests/sheets.mjs lotti,greta,pflaume   # Sheets in Render-Auflösung → tests/out/sheet_<key>.png
node tests/render.mjs                                        # Spiel-Screenshots in voller Auflösung → tests/out/r0*.png
node tests/run.mjs                                           # Logik-Tests (laufen mit Skalierung 1)
```

PNGs mit dem Read-Werkzeug ansehen und so lange nachbessern, bis Formen, Licht und Lesbarkeit stimmen.
`PORT_BASE=<n>` vor jeden Testbefehl setzen, wenn mehrere Agenten parallel arbeiten.
