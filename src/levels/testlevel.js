// Testlevel für die Bewegung: Ebenen, Treppen, Lücken, hohe Türme zum Gleiten.
import { Grid } from './grid.js';
import { asciiToTiled } from './tiled.js';

export function buildTestLevel() {
  const W = 200, H = 22;
  const g = new Grid(W, H);
  const FLOOR = 19; // oberste Bodenzeile (Zeilen 19..21 sind Boden)

  // Grundboden
  g.rect(0, FLOOR, W - 1, H - 1, '#');

  // Start
  g.set(3, FLOOR - 1, 'P');

  // Abschnitt A: Treppe hoch und runter (Kollision/Kanten testen)
  g.rect(14, FLOOR - 1, 16, FLOOR - 1, '#');
  g.rect(17, FLOOR - 2, 19, FLOOR - 1, '#');
  g.rect(20, FLOOR - 3, 22, FLOOR - 1, '#');
  g.rect(23, FLOOR - 2, 25, FLOOR - 1, '#');
  g.rect(26, FLOOR - 1, 27, FLOOR - 1, '#');

  // Gegner: Laufkäfer auf der Startebene, Pilz hinter der Treppe
  g.set(9, FLOOR - 1, 'k');
  g.set(29, FLOOR - 1, 'm');

  // Pflaume wartet auf der Treppe, Beeren dahinter
  g.set(21, FLOOR - 4, 'F');
  g.set(33, FLOOR - 2, 'R');
  g.set(38, FLOOR - 2, 'U');
  g.set(40, FLOOR - 2, 'Y');

  // Steinblöcke als Hindernis (Kopfstoß testen)
  g.hline(31, 34, FLOOR - 5, 'B');
  g.set(36, FLOOR - 2, 'B');

  // Abschnitt B: Lücken mit wachsender Breite (2, 3, 4, 5 Tiles)
  let x = 42;
  for (const gap of [2, 3, 4, 5]) {
    g.rect(x, FLOOR, x + gap - 1, H - 1, '.');
    x += gap + 6;
  }
  // kleine Insel in der letzten Lücke-Reihe fürs Timing
  g.hline(x - 10, x - 8, FLOOR - 3, '=');
  // Laufkäfer zwischen den Lücken, Checkpoint danach
  g.set(55, FLOOR - 1, 'k');
  g.set(x + 2, FLOOR - 1, 'C');
  g.set(x + 6, FLOOR - 1, 'm');

  // Abschnitt C: Plattformen (einseitig) als Treppe nach oben
  x = 84;
  g.hline(x, x + 3, FLOOR - 3, '=');
  g.hline(x + 6, x + 9, FLOOR - 6, '=');
  g.hline(x + 12, x + 15, FLOOR - 9, '=');
  g.hline(x + 18, x + 22, FLOOR - 12, '=');
  // Hoher Turm als Absprung für lange Gleitflüge
  g.rect(x + 26, FLOOR - 15, x + 29, H - 1, '#');
  g.set(x + 13, FLOOR - 10, 'k'); // Käfer auf Plattform (dreht an Kante um)

  // Abschnitt D: Große Schlucht – nur mit Gleiten/Sturzflug zu überwinden
  const pitStart = x + 30, pitEnd = x + 30 + 44;
  g.rect(pitStart, FLOOR, pitEnd, H - 1, '.');
  // tiefe Schlucht: Boden ganz unten entfernt, damit man fallen kann
  // (Spieler respawnt später bei Checkpoint; jetzt: Weltgrenze fängt)
  // Zwischenlandeplatz in der Mitte, tiefer gelegen
  g.rect(pitStart + 20, FLOOR + 1, pitStart + 23, H - 1, '#');

  // Zielplattform nach der Schlucht + Steinblock-Wand als Abschluss
  g.rect(pitEnd + 1, FLOOR - 2, pitEnd + 6, H - 1, '#');
  g.rect(W - 3, FLOOR - 8, W - 1, H - 1, 'B');

  return asciiToTiled(g.toRows(), { name: 'Testlevel' });
}
