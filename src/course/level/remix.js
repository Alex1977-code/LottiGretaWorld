// Remix-Level (Präzisierung „Motor und Bausteine Bonuswelten“, Vertrag „Remix-Level“ im Abschnitt Bonuswelten):
// ein Remix übernimmt ein vorhandenes Level ALS DATEN und wendet Regeln an, statt es zu kopieren. Ändert sich das
// Basislevel, wirkt das im Remix mit; die Basis selbst bleibt unverändert (der Remix arbeitet auf einer tiefen Kopie,
// Funktionen und Objekte mit eigener Klasse werden geteilt).
//
//   import { remixOf } from '../../level/remix.js';
//   export const LEVEL = remixOf('2-4', { id: 'P-1', world: 10, title: 'Eigener Titel', light: 'nacht', … });
//
// remixOf(base, rules) → Remix-Platzhalter { id, world, title, archetype?, remix: { base, rules } }. Die Registry
// (levels/index.js getLevel) löst ihn beim ersten Abruf auf (resolveRemix) und liefert danach ein gewöhnliches LEVEL
// (gemerkt; refreshRemix(level) vergisst die Auflösung). base = Level-Id (über die Registry, auch ein anderer Remix) oder
// das LEVEL-Objekt selbst (import { LEVEL as BASIS } from '../w1/1-1.js'). Fehlt die Basis, entsteht ein leeres Level mit
// remix.missing = true (und einer Warnung).
//
// Regeln (alle optional außer id; Reihenfolge der Anwendung wie hier):
//   id, world, title                 Pflicht/Meta des Remix (Titel: eigener deutscher Titel)
//   keep: { box: [x0, y0, z0, x1, y1, z1] | [x0, z0, x1, z1], hooks: 'filter' | 'all' | false, camera: true, margin: 2 }
//                                    Abschnitt kürzen: nur Objekte, deren Hüllquader den Bereich schneidet, bleiben
//                                    (segments, blocks, enemies, items, Unterlisten `items` der Kulissen-Bausteine,
//                                    checkpoint, stars, stamp, goal, Kameraschienen nach z/area). Haken der Basis laufen
//                                    gefiltert ('filter': statische Geometrie und feste Kollisionsformen ganz außerhalb
//                                    entfallen, Entitäten außerhalb werden gleich wieder entfernt; eigene Objekte bleiben),
//                                    ungefiltert ('all') oder gar nicht (false).
//   remove: [Auswahl …]              Objekte entfernen (siehe Auswahl unten; Daten und Entitäten aus den Basis-Haken)
//   replaceKind: { alt: 'neu' | { kind: 'neu', …Felder } }   Art ersetzen (blocks/enemies/items, Entitäten der Basis-Haken
//                                    und alle Laufzeit-spawns, z. B. aus ?-Blöcken) – { huepfmaus: 'huepfmaus_stachel' }
//   replaceType: { alt: 'neu' | { type: 'neu', …Felder } }   Baustein-Typ ersetzen (segments)
//   replace: [{ match: Auswahl, with: { … } | (eintrag) => eintrag | eintrag[] | null }]
//                                    Eintrag ersetzen: Objekt = neuer Eintrag (übernimmt pos/from/to/path, wenn er keine
//                                    eigenen hat), Funktion = frei (null entfernt, Liste = mehrere)
//   change: [{ match: Auswahl, set: { … }, move: [dx, dy, dz], fn(eintrag) }]   Felder ändern/verschieben
//   stars: [[x, y, z] | { pos, id, hidden } …] (alle neu) | { 0: [x, y, z], 2: null } (je Index setzen/entfernen)
//   stamp: false (Stempel aus – Pilz/Blume) | [x, y, z] | { pos }
//   timeLimit: s                     Zeitlimit
//   clocks: [[x, y, z] …] | { list, sec: 10, id }     Zeit-Uhren (Baustein zeituhren: +sec Restzeit je Uhr)
//   light: 'nacht' | 'abend' | 'morgen' | 'tag' | 'dunkel'   Beleuchtung umstellen (Themen-Variante `<thema>@<licht>`,
//                                    view/themeVariants.js)
//   filter: 'schwarzweiss'           Schwarz-Weiß-Filter über der 3D-Ansicht (CSS-Filter der Leinwand, HUD bleibt bunt)
//   theme: Name                      anderes Thema (vor light)
//   music: { theme?, variant? } | 'variante'   Musik: Thema (Standard: das der Basis) und Klang-Variante (nacht, abend,
//                                    morgen, tag, dunkel, schnell, schwarzweiss) → LEVEL.music (Name) + LEVEL.musicVariant;
//                                    CourseScene und Funkelstern rufen music.play(thema, { variant }) (Klang-Varianten des
//                                    Musiksystems, MUSIC_VARIANTS in audio/AudioEngine.js; unbekannte Variante = ohne).
//                                    Ohne Regel bleibt die Musik der Basis (auch deren Variante bei { theme, variant }).
//   beepSpeed: 4, beepWarn: false    Piep-Blöcke (piep_block/_treppe/_rutsche): Wechsel alle every/beepSpeed Zählzeiten
//                                    (Standard every 8 → 2), ohne Vorwarnung (warn 0)
//   add: { segments, blocks, enemies, items }   neue Objekte (nach allen anderen Regeln)
//   prebuild/build/setup(level, scene?), onStep(dt, t, level)   eigene Haken (laufen nach denen der Basis)
//   baseHooks: true | false | { prebuild, build, setup }        Haken der Basis abschalten (false)
//   jedes andere Feld (start, goal, checkpoint, camera, killY, sky, archetype, marks …) überschreibt das der Basis
//   (marks werden zusammengeführt).
//
// Auswahl (für remove, replace, change): Objekt mit beliebigen Bedingungen (alle müssen passen) –
//   id: 'x' | ['x', …], kind: 'pilzling' | [...], type: 'island' | [...], box: [x0, y0, z0, x1, y1, z1] | [x0, z0, x1, z1]
//   (Ankerpunkt pos / Mitte from–to / erster Pfadpunkt liegt im Bereich), in: 'segments' | 'blocks' | 'enemies' | 'items' |
//   'deco' (Unterlisten `items` der Kulissen-Bausteine) | Liste (Standard: segments, blocks, enemies, items),
//   where: (eintrag, liste) => bool. Kurzform: 'name' = id, kind oder type gleich 'name'.
//
// Ergebnis-Feld LEVEL.remix = { base, removed, replaced, changed, added, kept, cut, light, filter, variant, missing }.

import { remixTheme } from '../view/themeVariants.js';

const REMIX = Symbol('remix');
const LISTS = ['segments', 'blocks', 'enemies', 'items'];
const RULE_KEYS = new Set([
  'remix', 'base', 'keep', 'remove', 'replaceKind', 'replaceType', 'replace', 'change', 'stars', 'stamp', 'clocks', 'light',
  'filter', 'music', 'beepSpeed', 'beepWarn', 'add', 'prebuild', 'build', 'setup', 'onStep', 'baseHooks', 'marks',
]);
const PIEP = new Set(['piep_block', 'piep_treppe', 'piep_rutsche']);
const PIEP_EVERY = 8, PIEP_WARN = 3;

let SOURCE = null;
const CACHE = new WeakMap();

/** Level-Quelle für Basis-Ids (levels/index.js meldet getLevel hier an – ohne Importkreis). */
export function setRemixSource(fn, raw = null) {
  SOURCE = fn;
  // Test-/Fehlersuch-Schnittstelle: Level-Daten abrufen (aufgelöst), Platzhalter, Remix zur Laufzeit auflösen
  if (typeof window !== 'undefined') window.__courseLevels = { get: fn, raw, remixOf, resolveRemix, refreshRemix, isRemix, applyFilter, cloneData };
}

/** Remix-Platzhalter anlegen (Auflösung später über resolveRemix bzw. die Registry). */
export function remixOf(base, rules = {}) {
  if (!rules.id) throw new Error('remixOf: rules.id fehlt');
  const stub = { id: rules.id, world: rules.world ?? null, title: rules.title ?? null, remix: { base: typeof base === 'string' ? base : base?.id ?? null, rules } };
  if (rules.archetype) stub.archetype = rules.archetype;
  Object.defineProperty(stub, REMIX, { value: { base, rules } });
  return stub;
}

export const isRemix = (L) => !!L && !!L[REMIX];

/** Platzhalter auflösen (gemerkt); gewöhnliche Level kommen unverändert zurück. */
export function resolveRemix(L) {
  if (!isRemix(L)) return L;
  let r = CACHE.get(L);
  if (!r) { r = buildRemix(L[REMIX].base, L[REMIX].rules); CACHE.set(L, r); }
  return r;
}

/** Gemerkte Auflösung vergessen (z. B. nach dem Ändern der Regeln in Tests). */
export function refreshRemix(L) { CACHE.delete(L); }

// ------------------------------------------------------------------ Hilfen: Kopie, Lage, Auswahl

const plain = (o) => o !== null && typeof o === 'object' && (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);

/** Tiefe Kopie von Daten (Arrays, schlichte Objekte); Funktionen und Klassen-Objekte werden geteilt. */
export function cloneData(v, seen = new WeakMap()) {
  if (Array.isArray(v)) {
    if (seen.has(v)) return seen.get(v);
    const out = [];
    seen.set(v, out);
    for (const x of v) out.push(cloneData(x, seen));
    return out;
  }
  if (plain(v)) {
    if (seen.has(v)) return seen.get(v);
    const out = {};
    seen.set(v, out);
    for (const k of Object.keys(v)) out[k] = cloneData(v[k], seen);
    return out;
  }
  return v;
}

const isP = (a) => Array.isArray(a) && a.length >= 2 && typeof a[0] === 'number' && typeof a[1] === 'number';
const P3 = (a) => (a.length >= 3 ? [a[0], a[1], a[2]] : [a[0], 0, a[1]]);
const ptOf = (v) => (isP(v) ? P3(v) : v && isP(v.pos) ? P3(v.pos) : null);

/** Ankerpunkt eines Eintrags: pos, Mitte from–to, erster Pfadpunkt, erstes Teil … (null = ohne Lage). */
export function anchorOf(e) {
  if (!e || typeof e !== 'object') return null;
  if (isP(e)) return P3(e);
  if (isP(e.pos)) return P3(e.pos);
  if (e.pos && typeof e.pos === 'object' && 'x' in e.pos) return [e.pos.x, e.pos.y ?? 0, e.pos.z];
  if (isP(e.from) && isP(e.to)) { const a = P3(e.from), b = P3(e.to); return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }
  for (const k of ['path', 'blocks', 'tiles', 'points', 'targets', 'parts', 'list', 'kisten', 'items']) {
    const l = e[k];
    if (Array.isArray(l) && l.length) { const p = ptOf(l[0]); if (p) return p; }
  }
  if (isP(e.from)) return P3(e.from);
  if (Array.isArray(e.area) && e.area.length === 4) return [(e.area[0] + e.area[2]) / 2, 0, (e.area[1] + e.area[3]) / 2];
  return null;
}

/** Hüllquader eines Eintrags aus allen bekannten Lage-Feldern → { x0, y0, z0, x1, y1, z1 } | null. */
export function boundsOf(e) {
  const b = { x0: Infinity, y0: Infinity, z0: Infinity, x1: -Infinity, y1: -Infinity, z1: -Infinity };
  let n = 0;
  const add = (p, s) => {
    const sx = (s?.[0] ?? 0) / 2, sy = s?.[1] ?? 0, sz = (s?.[2] ?? s?.[0] ?? 0) / 2;
    b.x0 = Math.min(b.x0, p[0] - sx); b.x1 = Math.max(b.x1, p[0] + sx);
    b.y0 = Math.min(b.y0, p[1]); b.y1 = Math.max(b.y1, p[1] + sy);
    b.z0 = Math.min(b.z0, p[2] - sz); b.z1 = Math.max(b.z1, p[2] + sz);
    n++;
  };
  const sizeOf = (o) => {
    const s = o?.size;
    if (Array.isArray(s)) return s.length === 2 ? [s[0], 0, s[1]] : s;
    if (typeof s === 'number') return [s, s, s];
    if (typeof o?.radius === 'number') return [o.radius * 2, o.radius * 2, o.radius * 2];
    return null;
  };
  const walk = (o, depth) => {
    if (!o || typeof o !== 'object' || depth > 2) return;
    if (isP(o)) { add(P3(o)); return; }
    if (isP(o.pos)) add(P3(o.pos), sizeOf(o));
    for (const k of ['from', 'to']) if (isP(o[k])) add(P3(o[k]), sizeOf(o));
    for (const k of ['path', 'blocks', 'tiles', 'points', 'targets', 'parts', 'list', 'kisten', 'items', 'weg']) {
      const l = o[k];
      if (Array.isArray(l)) for (const x of l) walk(x, depth + 1);
    }
    if (o.nodes && typeof o.nodes === 'object') for (const v of Object.values(o.nodes)) if (isP(v)) add(P3(v));
    if (Array.isArray(o.area) && o.area.length === 4 && typeof o.area[0] === 'number') { add([o.area[0], 0, o.area[1]]); add([o.area[2], 0, o.area[3]]); }
  };
  walk(e, 0);
  return n ? b : null;
}

/** Bereich [x0, y0, z0, x1, y1, z1] | [x0, z0, x1, z1] → { x0 … z1 } (y unbegrenzt bei 4 Werten). */
export function boxOf(a, margin = 0) {
  if (!Array.isArray(a)) return null;
  const B = a.length === 4
    ? { x0: Math.min(a[0], a[2]), z0: Math.min(a[1], a[3]), x1: Math.max(a[0], a[2]), z1: Math.max(a[1], a[3]), y0: -Infinity, y1: Infinity }
    : { x0: Math.min(a[0], a[3]), y0: Math.min(a[1], a[4]), z0: Math.min(a[2], a[5]), x1: Math.max(a[0], a[3]), y1: Math.max(a[1], a[4]), z1: Math.max(a[2], a[5]) };
  if (margin) { B.x0 -= margin; B.x1 += margin; B.z0 -= margin; B.z1 += margin; B.y0 -= margin; B.y1 += margin; }
  return B;
}

const inBox = (p, B) => !!p && p[0] >= B.x0 && p[0] <= B.x1 && p[1] >= B.y0 && p[1] <= B.y1 && p[2] >= B.z0 && p[2] <= B.z1;
const hitsBox = (bb, B) => !!bb && bb.x1 >= B.x0 && bb.x0 <= B.x1 && bb.z1 >= B.z0 && bb.z0 <= B.z1 && bb.y1 >= B.y0 && bb.y0 <= B.y1;
const asList = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);

/** Passt der Eintrag e (aus Liste listName) zur Auswahl sel? */
export function matches(sel, e, listName) {
  if (!e || typeof e !== 'object') return false;
  if (typeof sel === 'string') return e.id === sel || e.kind === sel || e.type === sel;
  if (typeof sel === 'function') return !!sel(e, listName);
  if (!sel || typeof sel !== 'object') return false;
  const where = sel.in ? asList(sel.in) : LISTS;
  if (listName && !where.includes(listName)) return false;
  if (sel.id !== undefined && !asList(sel.id).includes(e.id)) return false;
  if (sel.kind !== undefined && !asList(sel.kind).includes(e.kind)) return false;
  if (sel.type !== undefined && !asList(sel.type).includes(e.type)) return false;
  if (sel.box && !inBox(anchorOf(e), boxOf(sel.box))) return false;
  if (sel.where && !sel.where(e, listName)) return false;
  return true;
}

const decoList = (seg) => Array.isArray(seg?.items) && seg.items.length && typeof seg.items[0] === 'object' && !Array.isArray(seg.items[0]);

// ------------------------------------------------------------------ Auflösung

function emptyLevel(rules) {
  return { id: rules.id, world: rules.world ?? 0, title: rules.title ?? rules.id, archetype: 'parcours', theme: 'grass', music: 'course_grass', timeLimit: 400, start: { pos: [0, 1, 0], yaw: Math.PI / 2 }, segments: [], blocks: [], enemies: [], items: [], marks: {} };
}

function buildRemix(base, rules) {
  let src = typeof base === 'string' ? SOURCE?.(base) ?? null : base;
  if (isRemix(src)) src = resolveRemix(src);
  const info = { base: typeof base === 'string' ? base : src?.id ?? null, removed: 0, replaced: 0, changed: 0, added: 0, kept: null, cut: 0, light: rules.light ?? null, filter: rules.filter ?? null, variant: null, missing: !src };
  if (!src) console.warn(`[Remix ${rules.id}] Basislevel ${info.base} fehlt`);
  const L = cloneData(src ?? emptyLevel(rules));
  const hooks = { prebuild: src?.prebuild ?? null, build: src?.build ?? null, setup: src?.setup ?? null };
  for (const k of LISTS) L[k] = Array.isArray(L[k]) ? L[k].filter(Boolean) : [];

  // ---- 1 Abschnitt kürzen (keep)
  const keep = rules.keep?.box ? { ...rules.keep, B: boxOf(rules.keep.box), Bm: boxOf(rules.keep.box, rules.keep.margin ?? 2) } : null;
  if (keep) {
    let cut = 0;
    for (const k of LISTS) {
      const before = L[k].length;
      L[k] = L[k].filter((e) => { const bb = boundsOf(e); return !bb || hitsBox(bb, keep.Bm); });
      cut += before - L[k].length;
      if (k === 'segments') for (const s of L[k]) if (decoList(s)) { const n0 = s.items.length; s.items = s.items.filter((it) => { const p = anchorOf(it); return !p || inBox(p, keep.Bm); }); cut += n0 - s.items.length; }
    }
    const keepPt = (v) => { const p = anchorOf(Array.isArray(v) ? v : v); return !p || inBox(p, keep.Bm); };
    if (L.checkpoint) {
      if (isP(L.checkpoint)) { if (!keepPt(L.checkpoint)) { L.checkpoint = null; cut++; } }
      else if (Array.isArray(L.checkpoint)) L.checkpoint = L.checkpoint.filter(keepPt);
      else if (!keepPt(L.checkpoint)) { L.checkpoint = null; cut++; }
    }
    if (Array.isArray(L.stars)) { const n0 = L.stars.length; L.stars = L.stars.filter(keepPt); cut += n0 - L.stars.length; }
    if (L.stamp && !keepPt(L.stamp)) { L.stamp = null; cut++; }
    if (L.goal && !keepPt(L.goal)) { L.goal = null; cut++; }
    if (keep.camera !== false && Array.isArray(L.camera)) {
      const kept = L.camera.filter((c) => {
        const z0 = Math.min(c.from ?? 1e9, c.to ?? -1e9), z1 = Math.max(c.from ?? 1e9, c.to ?? -1e9);
        if (z1 < keep.Bm.z0 || z0 > keep.Bm.z1) return false;
        if (c.area && (c.area[1] < keep.Bm.x0 || c.area[0] > keep.Bm.x1)) return false;
        return true;
      });
      if (kept.length) L.camera = kept;
    }
    info.cut = cut;
    info.kept = LISTS.reduce((a, k) => a + L[k].length, 0);
  }

  // ---- 2 Entfernen
  const removeSel = asList(rules.remove);
  if (removeSel.length) {
    for (const k of LISTS) {
      const n0 = L[k].length;
      L[k] = L[k].filter((e) => !removeSel.some((s) => matches(s, e, k)));
      info.removed += n0 - L[k].length;
    }
    for (const s of L.segments) if (decoList(s)) {
      const n0 = s.items.length;
      s.items = s.items.filter((it) => !removeSel.some((sel) => typeof sel === 'object' && matches(sel, it, 'deco')));
      info.removed += n0 - s.items.length;
    }
  }

  // ---- 3 Arten/Typen ersetzen
  const RK = rules.replaceKind ?? null, RT = rules.replaceType ?? null;
  const swap = (e, map, field) => {
    const to = map?.[e[field]];
    if (!to) return e;
    info.replaced++;
    return typeof to === 'string' ? { ...e, [field]: to } : { ...e, ...to };
  };
  if (RK) for (const k of ['blocks', 'enemies', 'items']) L[k] = L[k].map((e) => swap(e, RK, 'kind'));
  if (RT) L.segments = L.segments.map((e) => swap(e, RT, 'type'));

  // ---- 4 Ersetzen (replace)
  for (const r of asList(rules.replace)) {
    for (const k of LISTS) {
      const out = [];
      for (const e of L[k]) {
        if (!matches(r.match, e, k)) { out.push(e); continue; }
        info.replaced++;
        let w = typeof r.with === 'function' ? r.with(cloneData(e)) : cloneData(r.with);
        if (w && !Array.isArray(w) && typeof w === 'object' && typeof r.with !== 'function') {
          for (const f of ['pos', 'from', 'to', 'path']) if (w[f] === undefined && e[f] !== undefined) w[f] = cloneData(e[f]);
        }
        for (const x of asList(w)) if (x) out.push(x);
      }
      L[k] = out;
    }
  }

  // ---- 5 Ändern (change)
  for (const c of asList(rules.change)) {
    for (const k of LISTS) {
      L[k] = L[k].map((e) => {
        if (!matches(c.match, e, k)) return e;
        info.changed++;
        let x = c.set ? { ...e, ...cloneData(c.set) } : e;
        if (c.move) x = moved(x, c.move);
        if (c.fn) x = c.fn(x) ?? x;
        return x;
      });
    }
  }

  // ---- 6 Piep-Blöcke
  if (rules.beepSpeed || rules.beepWarn === false) {
    const k = rules.beepSpeed ?? 1;
    for (const s of L.segments) {
      if (!PIEP.has(s.type)) continue;
      const every = Math.max(1, Math.round((s.every ?? PIEP_EVERY) / k));
      s.every = every;
      s.warn = rules.beepWarn === false ? 0 : Math.min(every - 1, s.warn ?? PIEP_WARN);
    }
    L.beepSpeed = k;
    L.beepWarn = rules.beepWarn !== false;
  }

  // ---- 7 Sterne, Stempel, Zeit
  if (rules.stars !== undefined) {
    if (Array.isArray(rules.stars)) L.stars = cloneData(rules.stars);
    else if (rules.stars && typeof rules.stars === 'object') {
      const st = Array.isArray(L.stars) ? L.stars.slice() : [];
      for (const [i, v] of Object.entries(rules.stars)) st[+i] = v === null ? undefined : cloneData(v);
      L.stars = st.filter((s) => s !== undefined);
    } else if (rules.stars === false) L.stars = [];
  }
  if (rules.stamp !== undefined) L.stamp = rules.stamp === false ? null : cloneData(rules.stamp);
  if (rules.clocks) {
    const c = Array.isArray(rules.clocks) ? { list: rules.clocks } : rules.clocks;
    L.segments.push({ type: 'zeituhren', ...cloneData(c) });
    info.added++;
  }

  // ---- 8 Hinzufügen
  for (const k of LISTS) for (const e of asList(rules.add?.[k])) { L[k].push(cloneData(e)); info.added++; }

  // ---- 9 Felder überschreiben
  for (const [k, v] of Object.entries(rules)) if (!RULE_KEYS.has(k)) L[k] = cloneData(v);
  L.marks = { ...(L.marks ?? {}), ...(cloneData(rules.marks) ?? {}) };
  if (!L.title) L.title = rules.id;

  // ---- 10 Musik, Thema, Licht, Filter
  const baseMusic = typeof L.music === 'string' ? L.music : L.music?.theme ?? 'course_grass';
  const baseVariant = typeof L.music === 'object' ? L.music?.variant ?? null : L.musicVariant ?? null;
  if (rules.music !== undefined) {
    const m = typeof rules.music === 'string' ? { variant: rules.music } : rules.music ?? {};
    L.music = m.theme ?? baseMusic;
    L.musicVariant = m.variant ?? null;
  } else { L.music = baseMusic; L.musicVariant = baseVariant; }
  info.variant = L.musicVariant;
  if (rules.light || rules.filter) L.theme = remixTheme(L.theme ?? 'grass', { light: rules.light, filter: rules.filter });
  if (rules.filter) L.filter = rules.filter;

  // ---- 11 Haken
  const bh = rules.baseHooks === undefined ? true : rules.baseHooks;
  const useBase = (n) => (bh === false ? false : bh === true ? true : bh[n] !== false);
  const guardMode = keep ? (keep.hooks ?? 'filter') : 'all';
  const st = { spawned: [] };
  L.prebuild = (level) => {
    installSpawn(level, RK, st);
    if (hooks.prebuild && useBase('prebuild') && guardMode !== false) runGuarded(level, hooks.prebuild, keep, guardMode, st, 'prebuild');
    safe(rules.prebuild, level, 'prebuild');
  };
  L.build = (level) => {
    if (hooks.build && useBase('build') && guardMode !== false) runGuarded(level, hooks.build, keep, guardMode, st, 'build');
    safe(rules.build, level, 'build');
  };
  L.setup = (level, scene) => {
    if (hooks.setup && useBase('setup') && guardMode !== false) runGuarded(level, hooks.setup, keep, guardMode, st, 'setup', scene);
    // Entitäten aus den Basis-Haken: Auswahl `remove` gilt auch für sie
    if (removeSel.length) {
      for (const e of st.spawned) {
        if (e.removed) continue;
        const d = { ...(e.spec ?? {}), kind: e.kind, pos: [e.pos.x, e.pos.y, e.pos.z] };
        if (removeSel.some((s) => matches(s, d, 'enemies') || matches(s, d, 'items') || matches(s, d, 'blocks'))) { drop(e); info.removed++; }
      }
    }
    if (rules.filter) applyFilter(level, scene, rules.filter);
    safe(rules.setup, level, 'setup', scene);
    if (typeof rules.onStep === 'function') level.onStep((dt, t) => rules.onStep(dt, t ?? level.time, level));
    level.remix = info;
  };
  L.remix = info;
  return L;
}

/** Eintrag verschieben (pos, from, to, path, parts, blocks, list). */
function moved(e, d) {
  const sh = (p) => (isP(p) ? (p.length >= 3 ? [p[0] + d[0], p[1] + (d[1] ?? 0), p[2] + (d[2] ?? 0)] : [p[0] + d[0], p[1] + (d[2] ?? 0)]) : p);
  const x = { ...e };
  for (const f of ['pos', 'from', 'to']) if (isP(x[f])) x[f] = sh(x[f]);
  for (const f of ['path', 'blocks', 'tiles', 'points']) if (Array.isArray(x[f])) x[f] = x[f].map(sh);
  for (const f of ['parts', 'list', 'items']) if (Array.isArray(x[f])) x[f] = x[f].map((q) => (q && isP(q.pos) ? { ...q, pos: sh(q.pos) } : q));
  return x;
}

function safe(fn, level, name, scene) {
  if (typeof fn !== 'function') return;
  try { fn(level, scene); } catch (err) { console.error(`[Remix ${level.data?.id}] Haken ${name} fehlgeschlagen:`, err); }
}

const drop = (e) => { e.alive = false; e.removed = true; };

/** level.spawn umleiten: Art ersetzen (replaceKind, auch zur Laufzeit) und Entitäten der Basis-Haken merken. */
function installSpawn(level, RK, st) {
  if (level._remixSpawn) return;
  const orig = level.spawn.bind(level);
  level._remixSpawn = orig;
  level.spawn = (kind, spec = {}) => {
    const to = RK?.[kind];
    let k = kind, sp = spec;
    if (to) { if (typeof to === 'string') k = to; else { k = to.kind ?? kind; sp = { ...spec, ...to }; } }
    const e = orig(k, sp);
    if (e && st.tracking) st.spawned.push(e);
    return e;
  };
}

/** Basis-Haken ausführen; mit keep 'filter' entfällt, was ganz außerhalb des Bereichs liegt. */
function runGuarded(level, fn, keep, mode, st, name, scene) {
  st.tracking = true;
  const n0 = st.spawned.length;
  const view = level.view, world = level.world;
  const restore = [];
  if (keep && mode === 'filter') {
    const B = keep.Bm;
    const out = (bb) => !!bb && (bb.max.x < B.x0 || bb.min.x > B.x1 || bb.max.z < B.z0 || bb.min.z > B.z1 || bb.max.y < B.y0 || bb.min.y > B.y1);
    if (view) {
      // statische Geometrie ganz außerhalb entfällt; eigene Objekte (view.add) bleiben – ihre Lage steht beim Anmelden oft
      // noch nicht fest (Modelle werden erst beim Zeichnen platziert), und das Frustum-Culling spart sie ohnehin
      const as = view.addStatic;
      view.addStatic = (g, o) => { g?.computeBoundingBox?.(); if (g?.boundingBox && out(g.boundingBox)) { g.dispose?.(); return; } as.call(view, g, o); };
      restore.push(() => { view.addStatic = as; });
    }
    const wa = world.add;
    world.add = (shape) => {
      if (shape && !shape.mover && Array.isArray(shape.min) && Array.isArray(shape.max)) {
        const bb = { min: { x: shape.min[0], y: shape.min[1], z: shape.min[2] }, max: { x: shape.max[0], y: shape.max[1], z: shape.max[2] } };
        if (out(bb)) return -1;
      }
      return wa.call(world, shape);
    };
    restore.push(() => { world.add = wa; });
  }
  try { fn(level, scene); } catch (err) { console.error(`[Remix ${level.data?.id}] Basis-Haken ${name} fehlgeschlagen:`, err); }
  finally { for (const r of restore) r(); st.tracking = false; }
  if (keep && mode === 'filter') {
    for (let i = n0; i < st.spawned.length; i++) {
      const e = st.spawned[i];
      const p = [e.pos.x, e.pos.y, e.pos.z];
      if (!inBox(p, keep.Bm)) drop(e);
    }
  }
}

// ------------------------------------------------------------------ Schwarz-Weiß-Filter

export const FILTERS = { schwarzweiss: 'grayscale(1) contrast(1.08) brightness(1.04)' };

/** CSS-Filter über die 3D-Leinwand legen (bis zum Szenenende). */
export function applyFilter(level, scene, name) {
  const css = FILTERS[name];
  const canvas = level.view?.canvas;
  if (!css || !canvas?.style) return false;
  const prev = canvas.style.filter;
  canvas.style.filter = css;
  level.view.filter = name;
  const reset = () => { canvas.style.filter = prev || ''; };
  scene?.events?.once?.('shutdown', reset);
  return true;
}
