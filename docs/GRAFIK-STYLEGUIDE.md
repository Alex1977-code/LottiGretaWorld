# Grafik-Styleguide „Lotti & Greta“

Ziel: Pixel-Art auf dem Niveau klassischer SNES-16-Bit-Plattformer (Vorbild: Super Mario World –
**eigene Entwürfe, keine Nintendo-Figuren, -Tiles oder -Namen nachbauen**). Alles wird prozedural
aus Pixel-Strings erzeugt (`src/gfx/sprites/*.js`, `src/gfx/tiles.js`, `src/gfx/background.js`).

## Look

- **Outlines:** jede Figur und jedes Objekt hat eine geschlossene, 1 px dunkle Kontur. Kein reines
  Schwarz, sondern ein sehr dunkler Ton der jeweiligen Grundfarbe (z. B. Haut → dunkles Rotbraun,
  Blatt → dunkles Oliv). Innenlinien (Arm vor Körper, Haaransatz) ebenfalls mit dunklerem Ton trennen.
- **Schattierung:** 3–4 Stufen pro Material: Schatten, Grundton, Licht, kleiner Glanzpunkt.
  Licht kommt von **oben links**. Schatten unten rechts und unter Überhängen (Hutkrempe, Kinn, Rock).
- **Formen:** rund, freundlich, kräftig. Figuren mit großem Kopf (ca. 45 % der Höhe), großen
  ausdrucksstarken Augen (Weiß + Pupille + ggf. 1 px Glanz), kleinen Körpern, klaren Händen/Füßen.
- **Silhouette:** auf 1x-Größe sofort erkennbar (Zöpfe/Frisur, Käferpanzer, Pilzhut …). Kein
  „Blob“: Konturen folgen der Anatomie, Gliedmaßen sind ablesbar.
- **Farben:** kräftig, gesättigt, Herbstwald. Gemeinsame Grundpalette (frei kombinierbar):
  - Umriss/Dunkel: `#2a1a12` `#4a230a` `#5a2d0c`
  - Haut: `#f8d9b4` Grund, `#e8b48c` Schatten, `#fff0dc` Licht
  - Dunkelblond (Lotti): `#8a6327` Schatten, `#b5893a` Grund, `#dcb45e` Licht, `#f1d78a` Glanz
  - Hellblond (Greta): `#c9a84f` Schatten, `#efd98e` Grund, `#fff0b8` Licht, `#fffbe6` Glanz
  - Rot: `#7a1f2b` `#c2383f` `#e85a5a` `#ff9a8a` · Orange: `#8f3b1f` `#d9742a` `#f3a35a` `#ffd39a`
  - Gelb: `#a8761a` `#f2c230` `#ffe36a` `#fff6c0` · Grün: `#2f5230` `#4f7d24` `#74a832` `#a9d65a`
  - Blau: `#1f3d7a` `#3f7fc4` `#6fb0ff` `#bfe0ff` · Lila: `#3b2460` `#6f52b8` `#9b7ae0` `#d9b8f0`
  - Braun/Holz/Erde: `#4a2a1a` `#6b3f1c` `#8d5a2b` `#b57a3c` `#d9a96a`
  - Stein: `#3f424b` `#5f626b` `#8c8f99` `#b3b6bf` `#e0e2e8`
- **Hintergrund** ist weicher und entsättigter als der Vordergrund, damit Figuren und Tiles sich
  abheben (Figuren: harte Outline; Hintergrund: keine harten Outlines, blauviolette Luftperspektive).

## Technische Verträge (müssen eingehalten werden)

Jedes Sprite-Modul exportiert `SHEETS = [{ key, frameWidth, frameHeight, frames, palette, variants? }]`.
`frames` = Objekt `{ frameName: string[] }`, jede Zeile exakt `frameWidth` Zeichen, exakt `frameHeight`
Zeilen. `palette` = `{ Zeichen: '#rrggbb' | null }` (eigene Buchstaben/Ziffern pro Modul, `.` = transparent).
`variants` (optional) = `{ suffix: { Zeichen: Farbe } }` erzeugt umgefärbte Kopien `<frame>_<suffix>`.

| Sheet | Frame | Frames (Namen fest) | Ausrichtung / Hitbox |
| --- | --- | --- | --- |
| `lotti`, `greta` | 24x24 | idle0, idle1, run0–run3, jump, fall, glide, ride, dive | blickt nach **rechts**, Füße auf unterster Zeile; Hitbox 10x14 mittig unten (Spalten 7–16, Zeilen 10–23); Kopf/Haare dürfen über die Hitbox hinausragen |
| `pflaume` | 24x20 | idle0, idle1, walk0, walk1, panic, fly (+ Varianten `_none/_red/_blue/_yellow` über `variants`) | blickt nach rechts, Füße unten; Hitbox allein 14x12 mittig unten; beim Reiten sitzt die Heldin so, dass ihre Füße 12 px über der Käfer-Unterkante liegen (Zeile 8) – Rücken/Panzer dort flach genug |
| `leaf` | 22x12 | leaf0, leaf1 | Blätterschirm, Stiel unten mittig |
| `walker` | 16x16 | walk0, walk1, squashed | Laufkäfer, blickt rechts, Hitbox 12x9 unten (Zeilen 7–15) |
| `hopper` | 16x16 | idle, squat, jump, squashed | hüpfender Pilz, Hitbox 12x14 (Zeilen 2–15) |
| `coin` | 12x12 | coin0–coin3 (Drehung) | große Sammelmünze |
| `coin_hud` | 8x8 | full, empty | HUD |
| `key` | 12x12 | key | |
| `gate` | 16x32 | closed, open | Tor, steht auf dem Boden |
| `flag` | 16x32 | flag0, flag1, flag2 | Zielfahne, Stange unten |
| `thorns` | 16x8 | thorns | Dornen, liegen am Boden |
| `checkpoint` | 16x32 | off, on | Pfosten mit Fahne |
| `heart` | 8x8 | full, empty | HUD |
| `berry` | 8x8 | berry (+ Varianten) | |
| `fireball` | 8x8 | fire0, fire1 | |
| `tiles` | 16x16 | Index 0–15 Boden-Autotile (Bitmaske oben=1, rechts=2, unten=4, links=8 = freiliegende Kante), 16 Plattform (einseitig, obere 6 px), 17/18 Steinblock | Reihenfolge/Indizes fest (`TILE_NAMES`, `TILE_INDEX`); weitere Tiles nur **anhängen** |

Sheet-Keys, Frame-Namen und Frame-Größen aus dieser Tabelle nicht ändern – der Code verlässt sich darauf.
Kommentare auf Deutsch, kurz.

## Prüf-Workflow

```bash
npm run build && node tests/sheets.mjs lotti,greta,pflaume    # Sheets 6x vergrößert → tests/out/sheet_<key>.png
node tests/run.mjs                                            # Spiel-Screenshots → tests/out/0*_*.png (Testlevel)
node tests/level1.mjs                                         # Level-1-Screenshots → tests/out/l1_*.png
```

PNGs mit dem Read-Werkzeug ansehen und so lange nachbessern, bis Silhouette, Schattierung und
Lesbarkeit stimmen. `node -e "import('./src/gfx/sprites/<modul>.js')"` prüft Syntax; die Frame-Maße
prüft `node tools/check-frames.mjs`.
