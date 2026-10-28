// Welt-8-Baustein Super-POW-Block (Präzisierung Motor und Bausteine Welt 8; Bauplan 8-Burg Finale: „riesiger Super-POW-Block,
// darauf der Endgegner mit der Flasche der gefangenen Feen. Super-POW-Block 4× anstoßen → Endgegner fliegt davon“).
//
// super_pow_block – riesiger, schwebender POW-Block. Jeder Stoß zählt: Kopfstoß von unten, Stampfattacke von oben, Wurfsichel,
//   Panzer, Bombe, Riesentrank (onHit) – mit kurzer Sperre `cool` s. Je Stoß: der Block staucht sich und federt, Schockwelle
//   (Ringe), Kamera wackelt stark, Leuchtstege leuchten auf; Gegner am Boden im Umkreis `radius` bekommen onHit('bump', block)
//   (außer fliegenden und solchen mit `superPowImmune`), Aktion `onHit` und Signal `signal` ({ hit, of, left, done, pos,
//   source, id }). Nach dem letzten Stoß (`hits`, Standard 4): Aktion `onDone`, Signal mit done: true, der Block zerspringt
//   in Splitter (vanish: true) bzw. bleibt grau (vanish: false). Versteckt (hidden: true) taucht er mit reveal() von unten auf.
//   { type: 'super_pow_block', id, pos: [x, y, z] (Mitte der Unterseite), size: 4 (Kantenlänge), hits: 4, cool: 0.6,
//     radius: 14, height: 4, signal: 'super_pow', onHit, onDone, vanish: true, hidden: false, rise: 2.5 (m Auftauchen),
//     look: 'eigen' }
//   level.named.get(id) = { hits (Stöße bisher), left, done, state ('versteckt'|'kommt'|'bereit'|'stoss'|'fertig'),
//     hit(via) (Stoß von außen, z. B. Boss/Test), reveal(), hide(), info() }; w8(level).pows. Kollision: Quader (tag
//   'super_pow'), Besitzer mit onBump/onPound/onHit.
//   Modell: Registry 'super_pow_block' ({ size }, Ursprung Mitte der Unterseite; state { anim: 'idle'|'hit'|'leer', hits,
//   left, squash }) – sonst eigener Block (blau, große Buchstaben „POW“, Zähler-Lämpchen).
//   Beispiel: { type: 'super_pow_block', id: 'superpow', pos: [0, 3.2, -200], size: 4, onDone: { signal: 'finale' } }

import * as THREE from 'three';
import { v3, lin, hex, box, colorize, merge, addObject } from '../kit.js';
import { runAction, visDt } from '../../entities/gimmick.js';
import { getModel } from '../../models/index.js';
import { w8, flash, regModel, canvasTexture, clamp } from '../w8kit.js';

function powTexture() {
  return canvasTexture('w8_superpow', 256, 256, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#5aa8ff'); gr.addColorStop(1, '#1a4ad8');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#0a2a8a'; g.lineWidth = 14; g.strokeRect(7, 7, W - 14, H - 14);
    g.strokeStyle = '#9ad0ff'; g.lineWidth = 5; g.strokeRect(22, 22, W - 44, H - 44);
    g.font = 'bold 92px "Nunito", "Arial Rounded MT Bold", Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 14; g.strokeStyle = '#0a1a5a'; g.strokeText('POW', W / 2, H / 2 + 4);
    g.fillStyle = '#fff6c0'; g.fillText('POW', W / 2, H / 2 + 4);
    g.fillStyle = '#ffd23a';
    for (const [x, y] of [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]]) { g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); }
  });
}

export function buildSuperPowBlock(level, spec) {
  const p = v3(spec.pos);
  const S = spec.size ?? 4;
  const N = Math.max(1, spec.hits ?? 4);
  const cool = spec.cool ?? 0.6, radius = spec.radius ?? 14, reachY = spec.height ?? 4;
  const rise = spec.rise ?? 2.5;
  const st = { hits: 0, cd: 0, state: spec.hidden ? 'versteckt' : 'bereit', t: 0, squash: 0, sv: 0, k: spec.hidden ? 0 : 1, last: null };
  let sid = null;
  const shape = { type: 'box', min: [p.x - S / 2, p.y, p.z - S / 2], max: [p.x + S / 2, p.y + S, p.z + S / 2], tag: 'super_pow' };
  const place = () => {
    const y = p.y - rise * (1 - st.k);
    shape.min = [p.x - S / 2, y, p.z - S / 2]; shape.max = [p.x + S / 2, y + S, p.z + S / 2];
    if (sid) level.world.update(sid);
  };
  const solid = (on) => {
    if (on && !sid) { place(); sid = level.world.add(shape); }
    else if (!on && sid) { level.world.remove(sid); sid = null; }
  };
  const handle = {
    get hits() { return st.hits; }, get left() { return N - st.hits; }, get done() { return st.hits >= N; }, get state() { return st.state; },
    hit(via = 'extern', source = null) {
      if (st.cd > 0 || st.hits >= N || (st.state !== 'bereit' && st.state !== 'stoss')) return false;
      st.cd = cool;
      st.hits++;
      st.last = via;
      st.state = 'stoss'; st.t = 0;
      st.sv -= 6;
      const lv = level, cx = p.x, cy = p.y, cz = p.z;
      lv.shake(0.9);
      lv.sfx('slam');
      lv.sfx('boss_hit');
      lv.effects?.ring({ x: cx, y: cy, z: cz }, S * 1.2);
      lv.effects?.ring({ x: cx, y: cy - 0.5, z: cz }, S * 2);
      flash(lv, cx, cy, cz, Math.max(10, radius), { by: 'super_pow', time: 2.6 });
      // Schockwelle: Gegner am Boden im Umkreis
      const R2 = radius * radius;
      for (const e of lv.entities) {
        if (!e.alive || e.removed || !e.enemy || e.flying || e.superPowImmune) continue;
        const ddx = e.pos.x - cx, ddz = e.pos.z - cz;
        if (ddx * ddx + ddz * ddz > R2 || Math.abs(e.pos.y - cy) > reachY + S) continue;
        e.onHit?.('bump', handle);
      }
      const done = st.hits >= N;
      const data = { hit: st.hits, of: N, left: N - st.hits, done, pos: [cx, cy + S, cz], source, via, id: spec.id ?? null };
      runAction(lv, spec.onHit, { pos: [cx, cy + S, cz], source: handle });
      lv.signal(spec.signal ?? 'super_pow', data);
      if (done) {
        st.state = 'fertig'; st.t = 0;
        runAction(lv, spec.onDone, { pos: [cx, cy + S, cz], source: handle });
        lv.sfx('victory');
        if (spec.vanish !== false) {
          lv.effects?.debris({ x: cx, y: cy + S / 2, z: cz }, 0x3a7aff, 24);
          lv.effects?.sparks({ x: cx, y: cy + S / 2, z: cz }, 30);
          solid(false);
        }
      }
      return true;
    },
    onBump(player) { handle.hit('kopf', player); },
    onPound(player) { handle.hit('stampfen', player); },
    onHit(kind, src) { if (kind === 'shell' || kind === 'bomb' || kind === 'mega' || kind === 'throw') handle.hit(kind, src); },
    onSichelHit(s) { handle.hit('sichel', s); },
    reveal() { if (st.state !== 'versteckt') return; st.state = 'kommt'; st.t = 0; solid(true); level.sfx('rumble'); },
    hide() { st.state = 'versteckt'; st.k = 0; solid(false); },
    info: () => ({ hits: st.hits, of: N, left: N - st.hits, state: st.state, last: st.last, solid: !!sid }),
  };
  shape.owner = handle;
  if (st.state !== 'versteckt') solid(true);
  if (spec.id) level.named.set(spec.id, handle);
  w8(level).pows.push(handle);
  level.onStep((dt) => {
    st.t += dt;
    if (st.cd > 0) st.cd -= dt;
    if (st.state === 'kommt') { st.k = clamp(st.t / 1.2, 0, 1); place(); if (st.k >= 1) st.state = 'bereit'; }
    if (st.state === 'stoss' && st.t > 0.4) st.state = 'bereit';
    st.sv += (-120 * st.squash - 10 * st.sv) * dt;
    st.squash += st.sv * dt;
  });

  if (!level.view) return handle;
  // ---------------- Darstellung
  const root = new THREE.Group();
  root.name = 'super_pow_block';
  const inner = new THREE.Group();
  root.add(inner);
  let model = null, mat = null, lamps = null;
  if (regModel(spec, 'super_pow_block')) {
    model = getModel('super_pow_block', { size: S });
    inner.add(model.root);
  } else {
    mat = new THREE.MeshStandardMaterial({ map: powTexture(), roughness: 0.4, metalness: 0.1, emissive: new THREE.Color(0x3a6aff), emissiveIntensity: 0.15 });
    const g = new THREE.BoxGeometry(S, S, S);
    g.translate(0, S / 2, 0);
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    inner.add(m);
    // Zähler: N Lämpchen auf der Vorderkante oben (leuchten aus, je Stoß eines)
    lamps = [];
    for (let i = 0; i < N; i++) {
      const lm = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd23a, toneMapped: false }));
      lm.position.set((i - (N - 1) / 2) * 0.55, S + 0.12, S / 2 - 0.3);
      inner.add(lm);
      lamps.push(lm);
    }
  }
  const holder = {};
  addObject(level, root, (dt) => {
    const d = visDt(level, holder, dt);
    const gone = st.state === 'fertig' && spec.vanish !== false;
    root.visible = !gone && st.state !== 'versteckt';
    root.position.set(p.x, p.y - rise * (1 - st.k), p.z);
    const q = clamp(st.squash, -0.35, 0.35);
    inner.scale.set(1 - q * 0.5, 1 + q, 1 - q * 0.5);
    if (mat) mat.emissiveIntensity = 0.15 + (st.state === 'stoss' ? 0.6 * (1 - st.t / 0.4) : 0) + (st.state === 'fertig' ? -0.15 : 0);
    if (mat && st.state === 'fertig') mat.color.setHex(0x8a8a9a);
    if (lamps) lamps.forEach((lm, i) => { lm.material.color.setHex(i < N - st.hits ? 0xffd23a : 0x3a3a4a); });
    model?.update?.(d, { anim: st.state === 'stoss' ? 'hit' : st.state === 'fertig' ? 'leer' : 'idle', hits: st.hits, left: N - st.hits, squash: q });
  });
  return handle;
}

export const TYPES = { super_pow_block: buildSuperPowBlock };
