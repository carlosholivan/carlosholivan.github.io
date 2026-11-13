// Import of an Anki deck (.apkg or .colpkg) into the app's vocabulary deck, entirely in the browser.
// Each Anki note is matched to a word of the app; its card keeps the Anki state (new / learning /
// relearning / review), interval, ease, reps, lapses and next due date. Libraries are loaded only when
// an import starts.
const LIBS = {
  zip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  sql: 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js',
  wasm: 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.wasm',
  zstd: 'https://cdn.jsdelivr.net/npm/fzstd@0.1.1/umd/index.js',
};
const loaded = {};
const script = (src) => loaded[src] ??= new Promise((res, rej) => {
  const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('lib'));
  document.head.appendChild(s);
});

const DAY = 86400000;
const KAN = /[\u3400-\u9fff々]/g, HAS_KAN = /[\u3400-\u9fff々]/;
const k2h = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const stripHtml = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/g, '');
// Shared cleaning: no HTML, furigana brackets, notes in parentheses, tildes, spaces or end punctuation.
const clean = s => stripHtml(s).replace(/\[[^\]]*\]/g, '').replace(/[（(][^）)]*[）)]/g, '')
  .replace(/[～〜~\s。．.!！?？]/g, '');
const AR_MARKS = /[ً-ٰٟـ]/g;

// Language-specific keys so that spelling variants still meet: kana/katakana, Arabic vowel marks…
const NORM = {
  ja: s => k2h(clean(s)),
  zh: s => clean(s),
  ar: s => clean(s).replace(AR_MARKS, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه'),
};

// vocab: Map(word → { w, r?, lv, q? }) of the app.
function matcher(lang, vocab) {
  const norm = NORM[lang];
  const byKey = new Map(), byReading = new Map();
  for (const v of vocab.values()) {
    const k = norm(v.w); if (k && !byKey.has(k)) byKey.set(k, v.w);
    if (lang === 'ja') { const r = k2h(v.r || v.w); (byReading.get(r) || byReading.set(r, []).get(r)).push(v.w); }
  }
  return (fields) => {
    const fs = fields.slice(0, 4);
    for (const f of fs) for (const part of [f, ...stripHtml(f).split(/[・/／、,;；]/)]) {
      const w = byKey.get(norm(part)); if (w) return w;
    }
    if (lang !== 'ja') return null;
    // Japanese: same reading + a shared kanji, or the only kana spelling of that reading.
    const word = clean(fs[0]), kanji = new Set(word.match(KAN) || []);
    for (const f of fs.slice(1)) {
      const r = k2h(clean(f)); if (!r || /[^぀-ゟー]/.test(r)) continue;
      const cands = byReading.get(r) || [];
      const withK = cands.filter(x => (x.match(KAN) || []).some(c => kanji.has(c)));
      if (withK.length) return withK[0];
      const kana = cands.filter(x => !HAS_KAN.test(x));
      if (kana.length === 1) return kana[0];
      if (!kanji.size && cands.length) return cands[0];
    }
    return null;
  };
}

// Anki card → card of the app (anki.js format).
function convert(c, crt, now) {
  const base = { step: 0, ivl: Math.max(0, c.ivl), ef: (c.factor || 2500) / 1000, reps: c.reps, lapses: c.lapses, added: now, anki: 1 };
  if (c.type === 0) return { ...base, s: 'new', due: 0, ivl: 0, ef: 2.5 };
  const dueDays = (crt * 1000) + c.due * DAY;          // review / day-learning: day number
  const dueTs = c.due * 1000;                         // intraday learning: epoch seconds
  if (c.type === 2) return { ...base, s: 'review', ivl: Math.max(1, c.ivl), due: dueDays };
  const due = c.queue === 3 ? dueDays : Math.min(dueTs, now + DAY);
  return { ...base, s: c.type === 3 ? 'relearn' : 'learn', due };
}
// For merging: how far the card has got.
const weight = c => !c ? -1 : c.s === 'known' ? 1e9 : (c.reps || 0) * 1000 + (c.ivl || 0);

export const ankiCategory = (c) => !c ? null : c.s === 'new' ? 'new' : c.s === 'learn' ? 'learn' : c.s === 'relearn' ? 'relearn'
  : c.s === 'review' ? (c.ivl >= 21 ? 'mature' : 'young') : c.s === 'known' ? 'known' : null;

// file: File (.apkg/.colpkg). Returns a report; the caller saves `cards` into S.cards.
export async function readAnki(file, { lang, vocab, cards, onStep = () => {} }) {
  onStep('libs');
  await Promise.all([script(LIBS.zip), script(LIBS.sql), script(LIBS.zstd)]);
  onStep('unzip');
  const zip = await window.JSZip.loadAsync(file);
  let bytes = null;
  if (zip.file('collection.anki21b')) bytes = window.fzstd.decompress(new Uint8Array(await zip.file('collection.anki21b').async('uint8array')));
  else if (zip.file('collection.anki21')) bytes = await zip.file('collection.anki21').async('uint8array');
  else if (zip.file('collection.anki2')) bytes = await zip.file('collection.anki2').async('uint8array');
  if (!bytes) throw new Error('format');
  onStep('read');
  const SQL = await window.initSqlJs({ locateFile: () => LIBS.wasm });
  const db = new SQL.Database(bytes);
  const rows = (q) => { const r = db.exec(q)[0]; return r ? r.values.map(v => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))) : []; };
  const crt = rows('select crt from col')[0]?.crt || 0;
  const notes = new Map(rows('select id, flds from notes').map(n => [n.id, n.flds.split('\x1f')]));
  const list = rows('select nid, ord, type, queue, due, ivl, factor, reps, lapses from cards');
  db.close();
  if (!list.length) throw new Error('empty');
  onStep('match');
  const match = matcher(lang, vocab);
  const now = Date.now();
  const best = new Map(), anki = { new: 0, learn: 0, relearn: 0, young: 0, mature: 0, total: list.length };
  const missing = [];
  for (const c of list) {
    const card = convert(c, crt, now);
    anki[ankiCategory(card)]++;
    const fields = notes.get(c.nid) || [];
    const w = match(fields);
    if (!w) { missing.push(clean(fields[0] || '')); continue; }
    if (weight(card) > weight(best.get(w))) best.set(w, card);
  }
  let added = 0, kept = 0;
  for (const [w, card] of best) {
    const cur = cards[w];
    if (cur && weight(cur) >= weight(card)) { kept++; continue; }
    cards[w] = { ...card, ...(cur?.r != null ? { r: cur.r } : vocab.get(w)?.q != null ? { r: vocab.get(w).q } : {}) };
    added++;
  }
  return { anki, matched: best.size, added, kept, missing: [...new Set(missing)].filter(Boolean) };
}
