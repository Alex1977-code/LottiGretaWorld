// Bausteine der Bonuswelt Stern (Präzisierung „Motor und Bausteine Bonuswelten“): Entitäts-Gimmicks als `type` in segments
// und die Sternenglanz-Belohnung.
//
// Entitäts-Gimmicks (Felder wie die gleichnamige Entität in entities/kinds/star_gimmicks.js): fliegender_zielmast,
//   scheinziel, felsblock, riesen_frageturm, laufbombe – { type: 'felsblock', … } ≙ { kind: 'felsblock', … }.
//   Mehrere auf einmal: { type: 'felsblock', list: [{ pos, … }, …], …gemeinsame Felder }.
//
// sternenglanz – Belohnung „Sternenglanz-Kostüm“ (Bauplan S-2 „Abschluss schaltet die zweite Spielfigur frei“, Vertrag:
//   Kostüm `stern` für Lotti und Greta): beim Levelabschluss (Ergebnis, Standard), sofort oder per Signal wird das Kostüm im
//   Spielstand freigeschaltet (courseSave.data.outfits.stern = { from, at }, additiv; die Figur-Gestaltung liest es), dazu
//   Ansage, Funkeln und Signal 'kostuem' ({ name, from }).
//   { type: 'sternenglanz', id, outfit: 'stern', when: 'ziel' | 'sofort' | 'signal' (Signal `sternenglanz` bzw. start()),
//     banner: 'Sternenglanz-Kostüm für Lotti und Greta!' | false }
//   level.named.get(id) = { unlocked, isNew, start(), info() }; star(level).rewards; Hilfen in blocks/starkit.js:
//   unlockOutfit(name, from), hasOutfit(name), outfits().

import { banner } from '../w3kit.js';
import { star, unlockOutfit, hasOutfit } from '../starkit.js';

const KINDS = ['fliegender_zielmast', 'scheinziel', 'felsblock', 'riesen_frageturm', 'laufbombe'];

const spawner = (kind) => (level, spec) => {
  if (Array.isArray(spec.list)) {
    const { list, type, ...common } = spec;
    void type;
    return list.map((it) => level.spawn(kind, { ...common, ...it }));
  }
  const { type, ...rest } = spec;
  void type;
  return level.spawn(kind, rest);
};

export function buildSternenglanz(level, spec) {
  const name = spec.outfit ?? 'stern';
  const st = { unlocked: hasOutfit(name), isNew: false, fired: false };
  const fire = () => {
    if (st.fired) return;
    st.fired = true;
    st.isNew = unlockOutfit(name, level.id ?? level.data?.id ?? null);
    st.unlocked = true;
    const p = level.player?.pos;
    if (p) level.effects?.sparks({ x: p.x, y: p.y + 1.2, z: p.z }, 30);
    level.sfx('powerup');
    level.signal?.('kostuem', { name, from: level.id, isNew: st.isNew });
    if (spec.banner !== false) banner(level, spec.banner ?? (name === 'stern' ? 'Sternenglanz-Kostüm für Lotti und Greta!' : `Neues Kostüm: ${name}`), { hold: 2.2, size: 15 });
  };
  const handle = {
    outfit: name, get unlocked() { return st.unlocked; }, get isNew() { return st.isNew; }, get fired() { return st.fired; },
    start: fire, info: () => ({ outfit: name, unlocked: st.unlocked, isNew: st.isNew, fired: st.fired }),
  };
  const when = spec.when ?? 'ziel';
  if (when === 'sofort') fire();
  else if (when === 'signal') level.onSignal?.('sternenglanz', fire);
  else {
    // beim Levelabschluss (runtime.finish → Ergebnis): erst speichern, dann freischalten
    const rt = level.runtime;
    if (rt?.finish) {
      const prev = rt.finish.bind(rt);
      rt.finish = (...a) => { const r = prev(...a); fire(); return r; };
    }
  }
  if (spec.id) level.named.set(spec.id, handle);
  star(level).rewards.push(handle);
  return handle;
}

export const TYPES = {
  ...Object.fromEntries(KINDS.map((k) => [k, spawner(k)])),
  sternenglanz: buildSternenglanz,
};
