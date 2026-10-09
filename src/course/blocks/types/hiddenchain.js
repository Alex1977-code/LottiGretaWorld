// Baustein `hiddenchain`: Kette unsichtbarer Blöcke (Bauplan 1-2 Stempel): Auf den (länglichen) ?-Block springen →
// der erste unsichtbare Block erscheint; daraufspringen → der nächste erscheint … bis zum Sims mit dem Ziel.
//
// Parameter:
//   blocks:  [[x, y, z], …]   Blöcke der Kette (Mitte der Unterseite, 1-m-Würfel) in Reihenfolge
//   lead:    { pos, size: [3, 1, 1] }  sichtbarer länglicher ?-Block, der die Kette startet (Betreten oder
//            Kopfstoß). Ohne lead ist der erste Block ein normal versteckter Block (Kopfstoß von unten zeigt ihn).
//   trigger: 'step' (Standard) – Betreten des vorigen Blocks zeigt den nächsten | 'bump' – jeder nächste Block
//            ist ein versteckter Block (nur von unten fest), der per Kopfstoß erscheint
//   hint:    false   true → halbdurchsichtige Umrisse der noch verborgenen Blöcke (Übungsplatz/Tests)
//   onDone:  Aktion (entities/gimmick.js), wenn der letzte Block erscheint
//   id:      Name → level.named: { blocks, shown, revealNext() }
// Beispiel:
//   { type: 'hiddenchain', lead: { pos: [0, 1, -40], size: [3, 1, 1] },
//     blocks: [[2.5, 3, -41], [4.5, 5, -42], [6.5, 7, -42]] }
// Modelle 'question_block' (gestreckt) und 'hidden_block' (state hidden/revealed).

import { v3, sz3, addObject } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';

export function buildHiddenChain(level, spec) {
  const mode = spec.trigger === 'bump' ? 'bump' : 'step';
  const chain = { blocks: [], shown: 0, done: false };
  const reveal = (b) => {
    if (b.shown) return;
    b.shown = true;
    const s = b.shape;
    s.fromBelowOnly = false; s.solid = true;
    if (b.id) level.world.update(b.id); else b.id = level.world.add(s);
    b.n = (b.n ?? 0) + 1;
    chain.shown = chain.blocks.filter((q) => q.shown).length;
    level.sfx('blockhit');
    level.effects?.sparks({ x: b.x, y: b.y + 0.5, z: b.z }, 8);
    if (chain.shown === chain.blocks.length && !chain.done) { chain.done = true; level.sfx('key'); runAction(level, spec.onDone, { pos: [b.x, b.y + 1, b.z], source: chain }); }
  };
  chain.revealNext = () => { const b = chain.blocks.find((q) => !q.shown); if (b) { reveal(b); arm(chain.blocks.indexOf(b) + 1); } };
  /** Block i „scharf“ machen: im bump-Modus als versteckter Block (nur von unten fest). */
  const arm = (i, force = false) => {
    const b = chain.blocks[i];
    if (!b || b.shown || b.id || (mode !== 'bump' && !force)) return;
    b.shape.fromBelowOnly = true;
    b.id = level.world.add(b.shape);
  };
  for (const p of spec.blocks ?? []) {
    const q = v3(p);
    const b = { x: q.x, y: q.y, z: q.z, shown: false, id: null, n: 0 };
    b.onBump = () => { if (!b.shown) { reveal(b); arm(chain.blocks.indexOf(b) + 1); } };
    b.shape = { type: 'box', min: [q.x - 0.5, q.y, q.z - 0.5], max: [q.x + 0.5, q.y + 1, q.z + 0.5], owner: b, tag: 'hiddenchain' };
    chain.blocks.push(b);
    if (level.view) {
      const m = getModel('hidden_block', { debug: !!spec.hint });
      m.root.position.set(q.x, q.y, q.z);
      addObject(level, m.root, (dt) => m.update(visDt(level, b, dt), { anim: b.shown ? 'revealed' : 'hidden', n: b.n }));
    }
  }
  // Startblock: länglicher ?-Block oder erster versteckter Block
  let lead = null;
  if (spec.lead) {
    const lp = v3(spec.lead.pos), ls = sz3(spec.lead.size, [3, 1, 1]);
    lead = { started: false, onBump: () => start() };
    level.world.add({ type: 'box', min: [lp.x - ls.x / 2, lp.y, lp.z - ls.z / 2], max: [lp.x + ls.x / 2, lp.y + ls.y, lp.z + ls.z / 2], owner: lead, tag: 'chainlead' });
    if (level.view) {
      const m = getModel('question_block');
      m.root.position.set(lp.x, lp.y, lp.z);
      m.root.scale.set(ls.x, ls.y, ls.z);
      let n = 0, was = false;
      addObject(level, m.root, (dt) => { if (lead.started !== was) { was = lead.started; n++; } m.update(visDt(level, lead, dt), { anim: lead.started ? 'used' : 'idle', n }); });
    }
  } else arm(0, true);
  function start() {
    if (lead?.started) return;
    if (lead) lead.started = true;
    const b = chain.blocks[0];
    if (!b) return;
    if (mode === 'bump') arm(0); else { reveal(b); }
  }
  if (spec.id) level.named.set(spec.id, chain);
  // Betreten zeigt den nächsten Block (step-Modus) bzw. startet über den lead
  level.onStep(() => {
    const p = level.player;
    if (!p || p.dead || p.mode !== 'ground') return;
    const o = p.ground?.owner;
    if (!o) return;
    if (o === lead) start();
    else if (mode === 'step') {
      const i = chain.blocks.indexOf(o);
      if (i >= 0 && chain.blocks[i + 1] && !chain.blocks[i + 1].shown) reveal(chain.blocks[i + 1]);
    }
  });
  return chain;
}

export const TYPES = { hiddenchain: buildHiddenChain };
