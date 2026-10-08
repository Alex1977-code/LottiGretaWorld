// Registry der Power-ups der Spielfigur (Kurs-Modus). Sammelt alle Module unter ./powers/ automatisch:
// jedes exportiert `POWERS = { name: def }`. Neue Power-ups (Feuerbälle, Wurfsichel, Gleitblatt …) sind
// neue Dateien – Player.js ruft nur die Hooks auf.
//
// def (alle Felder optional):
//   label        Anzeigename (HUD/Pause)
//   icon         Farbe des HUD-Symbols (0xRRGGBB)
//   big          true: Figur ist mit diesem Power-up groß (Standard true)
//   duration     s – zeitlich begrenzt (Riesentrank, Funkelstern); danach zurück zum vorigen Power-up
//   invulnerable true: Treffer wirkungslos, Berührung besiegt Gegner (onHit('star'))
//   canClimb     true: `climbable`-Wände hochklettern (Krallen-Anzug)
//   scale        Darstellungs-Faktor der Figur (Riesentrank)
//   onGain(player), onLose(player), update(player, dt, input)
//   onAction(player, input) → true, wenn verbraucht (Aktion-Taste: Y / X / Shift)
//   onAirCrouch(player, input) → true, wenn statt Stampfattacke etwas anderes passiert (Krallen-Sturzflug)
//   onTouchEntity(player, entity, contact) → 'stomp' | 'hurt' | 'none' | undefined (undefined = Standard)

const modules = import.meta.glob('./powers/*.js', { eager: true });
const REGISTRY = { none: { label: 'Normal', big: undefined } };
for (const [path, mod] of Object.entries(modules)) {
  for (const [name, def] of Object.entries(mod.POWERS ?? {})) {
    if (REGISTRY[name] && name !== 'none') console.warn(`[Power-ups] doppelter Name ${name} in ${path}`);
    REGISTRY[name] = def;
  }
}

export function getPower(name) { return REGISTRY[name] ?? REGISTRY.none; }
export function hasPower(name) { return !!REGISTRY[name]; }
export function listPowers() { return Object.keys(REGISTRY).sort(); }

/** Namen aus Level-Daten vereinheitlichen (krallenAnzug → krallen, Funkenblüte → funken …). */
const ALIASES = {
  krallenanzug: 'krallen', 'krallen-anzug': 'krallen', krallen: 'krallen', claw: 'krallen', cat: 'krallen',
  funkenbluete: 'funken', funkenblüte: 'funken', funken: 'funken', fire: 'funken',
  riesentrank: 'riese', riese: 'riese', mega: 'riese',
  funkelstern: 'stern', stern: 'stern', star: 'stern',
  wachstumsbeere: 'wachstumsbeere', beere: 'wachstumsbeere', grow: 'wachstumsbeere',
  oneup: 'oneup', '1up': 'oneup', '1-up': 'oneup', extraleben: 'oneup',
};
export function normalizePower(name) {
  if (!name) return null;
  const k = String(name).toLowerCase().replace(/\s+/g, '');
  return ALIASES[k] ?? k;
}
