// B-2 „Wasserwürfel im Glitzerschacht“ – Welt Blume (Remix-Welt 2), Remix von 6-7 „Wuschelflucht im Glitzerschacht“ (Bauplan
// Welt Blume B-2: „Kippplattformen ersetzt durch schwebende Wasserwürfel; kurz vor dem Ende eine zweite Wuschel-Horde. Sterne:
// 1) Wand nahe dem Start (Krallen-Anzug). 2) Wolke hinter einem großen Ziegel. 3) 8 grüne Münzen vor dem Ende.“). Basis als
// Daten über remixOf (level/remix.js) – 6-7 bleibt unverändert. Senkrechter Autoscroller wie die Basis (Horde jagt von unten),
// Musik der Basis (course_fuzzymine, ohne Variante laut Vertrag), 400 s, kein Stempel.
//
// Remix-Regeln:
//   • Wippen-Galerie: die drei Wippen (und der Signal-Quetschblock über Wippe 3) sind weg – stattdessen schweben fünf
//     Wasserwürfel über dem Abgrund und wippen sanft auf und ab (hineinspringen, schwimmen, oben herausspringen; wer unten
//     oder seitlich hinausschwimmt, fällt). Die beiden Wuschel kreisen jetzt um das Würfelpaar in der Mitte.
//   • Zweite Wuschel-Horde kurz vor dem Ende: die Galerie-Horde wartet, bis die Heldin auf dem letzten Felspfeiler steht,
//     und rollt dann schnell (2,4 m/s) hinterher – über die Wolkenbrücke zum Grubentor (sie hält vor dem Torplatz).
//   • Schacht-Daten: rechts neben der Sohle eine Kletterkammer (Felsrahmen, Glas zur Kamera), hinten an der Mittelstation eine
//     Nische mit Wolke, verschlossen von zwei Riesenziegeln.
// Sterne (neu): 0 Kletterkammer rechts der Sohle: Krallen-Anzug aus dem ?-Block am Sprungfeld, in der Kammer den Felspfeiler
//   mit den Kletterranken hinauf (ohne Krallen zu hoch; die Trennwand zum Schacht lässt kein Wandrutschen zu) · 1 Mittelstation:
//   Stampfattacke auf die Riesenziegel vor der Nische → auf der Wolke dahinter · 2 Sternring am Torplatz: acht grüne Sternmünzen
//   rund ums Deck (an den Rändern, fern vom Zielmast) in 14 s, der Stern erscheint vorn links auf dem Deck.
import { remixOf } from '../../level/remix.js';
import { LEVEL as BASIS, M67 } from '../w6/6-7.js';
import { felsGeo } from '../w6/_helpers_d.js';
import { grossbloecke } from '../w9/_helpers_c.js';
import { hohlraum, kletterpfeiler, schwebewuerfel, line, ring } from './_helpers_ba.js';
import { Bld, litTop } from '../w5/_helpers_b.js';

const PI = Math.PI;
const { X0, X1, ZB, ZF, ZL, YT, YK } = M67;
// Kletterkammer rechts der Sohle (Innenraum) und Felspfeiler darin
const KAMMER = { x0: X1, x1: 11.6, y1: 9.6, z0: -3.0 };
const PFEILER = { min: [9.8, 0, -3.0], max: [11.6, 7.8, -0.5] };
// Nische hinter der Mittelstation (Innenraum, Schlitz zur Bühne) und die beiden Riesenziegel davor
const NISCHE = { x0: 2, x1: 6, y0: 23.6, y1: 29.6, z0: -6.5, z1: -4.5, slot: [YK, YK + 2] };
const ZIEGEL = [[3, YK, ZB], [5, YK, ZB]];

const rocks = hohlraum(BASIS.schacht.rocks, [
  { min: [KAMMER.x0, 0, KAMMER.z0], max: [KAMMER.x1, KAMMER.y1, ZF] },
  { min: [NISCHE.x0, NISCHE.y0, NISCHE.z0], max: [NISCHE.x1, NISCHE.y1, NISCHE.z1] },
  { min: [NISCHE.x0, NISCHE.slot[0], NISCHE.z1], max: [NISCHE.x1, NISCHE.slot[1], ZB] },
]);
// Trennwand Kammer ↔ Schacht über der Tür (nur Optik; die Kollision ohne Wandrutschen setzt der Aufbau-Haken)
rocks.push({ min: [X1, 2.8, KAMMER.z0], max: [8.6, KAMMER.y1, ZF], solid: false, cell: 1.0 });

// Wasserwürfel der Galerie (Mitte unten in der Mittellage; Lücken zwischen den Felspfeilern)
const WUERFEL = [
  { pos: [0, YT - 1.6, -17.0], size: [4, 3.8, 5], period: 3.8, phase: 0 },
  { pos: [0, YT - 1.4, -27.2], size: [3.6, 3.4, 3], period: 3.4, phase: 0.5 },
  { pos: [0, YT - 1.2, -31.2], size: [3.6, 3.4, 3], period: 3.4, phase: 0 },
  { pos: [0, YT - 1.6, -41.8], size: [4, 3.6, 3.6], period: 3.6, phase: 0.25 },
  { pos: [1.4, YT - 1.0, -46.5], size: [3.4, 3.4, 3.4], period: 3.0, phase: 0.75 },
];

export const LEVEL = remixOf('6-7', {
  id: 'B-2',
  world: 11,
  title: 'Wasserwürfel im Glitzerschacht',
  timeLimit: 400,
  stamp: false,
  remove: [{ id: ['wippe1', 'wippe2', 'wippe3', 'q8'] }],
  change: [
    // zweite Wuschel-Horde: erst auf dem letzten Felspfeiler, dann schnell bis vor den Torplatz
    { match: { id: 'horde_galerie' }, set: { pos: [0, YT - 5, -40], speed: 2.4, delay: 0.3, end: -60.4, trigger: { min: [-3, YT - 2, -53.3], max: [3, YT + 8, -49.0] } } },
    // die beiden Wuschel kreisen über dem Würfelpaar (knapp über den Köpfen der Schwimmer – beim Aussprung aufpassen)
    { match: { id: 'w_wippe2' }, set: { center: [0, YT + 3.8, -29.2] } },
    // Absturz-Ebene der Galerie erst ab der Galerie (z ≤ −7) – die Nische hinter der Mittelstation reicht bis z −6,5
    { match: { type: 'killplane' }, set: { pos: [0, M67.YT - 14, -46.5], size: [30, 79] } },
    // Schild am Galerie-Eingang
    { match: { type: 'sign', where: (s) => /Wippen/.test(s.text ?? '') }, set: { text: 'Wasser-\nwürfel!' } },
  ],
  // Fahrt beginnt erst über dem ersten Brett (Basis: auf ihm) – Kletterkammer, ?-Block und Sprungfeld in Ruhe
  scroll: { ...BASIS.scroll, trigger: { min: [X0, 6.9, -4], max: [X1, 30, 3] } },
  schacht: {
    ...BASIS.schacht,
    rocks,
    glass: [...BASIS.schacht.glass, { min: [KAMMER.x0, 0, ZF], max: [KAMMER.x1, KAMMER.y1, ZF + 0.3] }],
    frames: BASIS.schacht.frames.filter((f) => !(f.y > 20 && f.y < 26 && f.x0 > 0)),
    crystals: [
      ...BASIS.schacht.crystals,
      { pos: [11.1, 0, -2.6], size: 0.6, n: 3, color: 'gold' }, { pos: [9.0, 0, 0.9], size: 0.45, n: 2, color: 'rosa' },
      { pos: [2.6, NISCHE.y0, -6.2], size: 0.5, n: 2 }, { pos: [5.6, NISCHE.y0, -6.2], size: 0.5, n: 2, color: 'rosa' },
    ],
  },
  stars: [
    [(PFEILER.min[0] + PFEILER.max[0]) / 2, PFEILER.max[1] + 0.05, -1.7],     // 0: oben auf dem Kletterpfeiler in der Kammer
    [(NISCHE.x0 + NISCHE.x1) / 2, YK + 0.05, (NISCHE.z0 + NISCHE.z1) / 2],      // 1: auf der Wolke hinter den Riesenziegeln
    { pos: [-5.0, YT + 0.3, -66.2], hidden: true, id: 'b2_ringstern' },       // 2: Sternring (erscheint vorn links auf dem Deck)
  ],
  add: {
    segments: [
      // Wolke in der Nische hinter den Riesenziegeln
      { type: 'wolkenplattform', id: 'b2_wolke', pos: [(NISCHE.x0 + NISCHE.x1) / 2, YK - 0.6, (NISCHE.z0 + NISCHE.z1) / 2], size: [3.6, 0.6, 1.8], color: 'rosa', sink: 0.1 },
      { type: 'sign', pos: [6.9, 0, 0.6], text: 'Kletter-\nkammer', size: [1.8, 0.9], yaw: -0.5 },
      { type: 'deco_w6', items: [
        { kind: 'minenlampe', pos: [10.6, 6.2, 0.6] }, { kind: 'minenlampe', pos: [4.0, YK + 3.0, -4.0] },
        { kind: 'kristalle', pos: [-5.8, YT, -60.8], n: 2, size: 0.6 },
      ] },
    ],
    blocks: [
      // Krallen-Anzug für die Kletterkammer (am Sprungfeld der Sohle)
      { kind: 'question', pos: [6.4, 2.5, -0.2], content: 'krallenAnzug' },
    ],
    items: [
      // Bitcoins in der leeren Nische hinter dem Quetschblock (früher Stempel)
      line([-7.4, 0.6, ZL], [-6.2, 0.6, ZL], 3),
      // Hinweis-Münzen am Kletterpfeiler und vor den Riesenziegeln
      line([9.4, 2.0, -1.7], [9.4, 6.4, -1.7], 4),
      ...[3, 5].map((x) => ({ kind: 'coin', pos: [x, YK + 2.6, -2.6] })),
      // Sternring am Torplatz: acht grüne Sternmünzen rund ums Deck
      // (Weg an den Rändern des Decks – weit weg vom Zielmast in der Mitte)
      { kind: 'sternring', id: 'b2_ring', pos: [0, YT, -62.6], yaw: PI / 2, time: 14, star: 2, coins: [
        [-4.4, YT + 0.6, -66.8], [-5.4, YT + 0.6, -70.4], [-5.4, YT + 1.8, -74.4], [-4.0, YT + 0.6, -78.6],
        [4.0, YT + 0.6, -78.6], [5.4, YT + 1.8, -74.4], [5.4, YT + 0.6, -70.4], [4.4, YT + 0.6, -66.8],
      ] },
      ring([0, YT + 1.2, -29.2], 1.2, 5),
    ],
  },
  build(level) {
    // Trennwand der Kletterkammer: fest, aber ohne Wandrutschen/Wandsprung (nur der Pfeiler ist kletterbar)
    level.world.add({ type: 'box', min: [X1, 2.8, KAMMER.z0], max: [8.6, KAMMER.y1, ZF], noWallSlide: true, tag: 'kammerwand' });
    kletterpfeiler(level, { min: PFEILER.min, max: PFEILER.max, face: ['-x', '+z'] }, felsGeo);
    schwebewuerfel(level, { id: 'b2_wuerfel', list: WUERFEL });
    grossbloecke(level, { id: 'b2_ziegel', blocks: ZIEGEL.map(([x, y, z]) => [x, y, z]), size: 2 });
    // Neustart (Kontrollpunkt Galerie): die zweite Horde wartet wieder auf dem letzten Felspfeiler (statt dort zu lauern)
    const h = level.named.get('horde_galerie'), rt = level.runtime;
    if (h && rt?.respawn) {
      const orig = rt.respawn.bind(rt);
      rt.respawn = () => { orig(); h.state = 'wait'; h.waitT = 0; h.clock = 0; h.front = h.start; h.place(); };
    }
    // Holzrahmen um die Nische (Optik)
    if (level.view) {
      const b = new Bld();
      const wood = litTop(0x7a4e2a);
      b.box(0.4, NISCHE.slot[1] - NISCHE.slot[0] + 0.6, 0.4, NISCHE.x0 - 0.2, NISCHE.slot[0], ZB + 0.2, wood, { r: 0.05 });
      b.box(0.4, NISCHE.slot[1] - NISCHE.slot[0] + 0.6, 0.4, NISCHE.x1 + 0.2, NISCHE.slot[0], ZB + 0.2, wood, { r: 0.05 });
      b.box(NISCHE.x1 - NISCHE.x0 + 0.8, 0.4, 0.45, (NISCHE.x0 + NISCHE.x1) / 2, NISCHE.slot[1] + 0.2, ZB + 0.2, wood, { r: 0.05 });
      b.flush(level);
    }
  },
  marks: {
    kammer: [10.0, 0, 0.4], pfeiler: [9.4, 0, -1.7], nische: [4, YK, -2.4], galerie: [0, YT, -9.4], wuerfel1: [0, YT, -12.4],
    pfeiler3: [0, YT, -51.4], torplatz: [0, YT, -62], deck: [0, YT, -70],
  },
});
