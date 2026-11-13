// Anki-style card counts of a deck with a donut chart: new, learning, relearning, young (<21 d), mature (≥21 d)
// and words marked as known. store: S.cards / S.hcards; inDeck(word) restricts to one level deck (null = all).
const CATS = [
  ['new', '#4f8fea'], ['learn', '#e67e22'], ['relearn', '#e74c3c'],
  ['young', '#8fd19e'], ['mature', '#27ae60'], ['known', '#8e44ad'],
];
const LABEL = {
  es: { new: 'Nuevas', learn: 'Aprendiendo', relearn: 'Reaprendiendo', young: 'Jóvenes', mature: 'Maduras', known: 'Marcadas como sabidas', total: 'Total', title: 'Estadísticas del mazo', hint: 'Jóvenes: intervalo de menos de 21 días · Maduras: 21 días o más.' },
  en: { new: 'New', learn: 'Learning', relearn: 'Relearning', young: 'Young', mature: 'Mature', known: 'Marked as known', total: 'Total', title: 'Deck statistics', hint: 'Young: interval under 21 days · Mature: 21 days or more.' },
};

export function deckCounts(store, inDeck) {
  const n = { new: 0, learn: 0, relearn: 0, young: 0, mature: 0, known: 0 };
  for (const [w, c] of Object.entries(store || {})) {
    if (inDeck && !inDeck(w)) continue;
    const k = c.s === 'review' ? (c.ivl >= 21 ? 'mature' : 'young') : c.s;
    if (k in n) n[k]++;
  }
  return n;
}

export function deckPie(store, inDeck, lang = 'es') {
  const L = LABEL[lang] || LABEL.en;
  const n = deckCounts(store, inDeck);
  const total = Object.values(n).reduce((a, b) => a + b, 0);
  if (!total) return '';
  const R = 15.9155, C = 100; // circumference 100 → dash values are percentages
  let off = 25, arcs = '';
  for (const [k, col] of CATS) {
    const p = n[k] / total * C;
    if (!p) continue;
    arcs += `<circle r="${R}" cx="21" cy="21" fill="none" stroke="${col}" stroke-width="6" stroke-dasharray="${p.toFixed(3)} ${(C - p).toFixed(3)}" stroke-dashoffset="${off.toFixed(3)}"><title>${L[k]}: ${n[k]}</title></circle>`;
    off -= p;
  }
  const rows = CATS.filter(([k]) => n[k] || k !== 'known').map(([k, col]) =>
    `<div class="pie-row"><i style="background:${col}"></i><span>${L[k]}</span><b>${n[k]}</b><span class="muted">${total ? Math.round(n[k] / total * 100) : 0}%</span></div>`).join('');
  return `<details class="card deck-pie mb-16" open><summary class="h3">📊 ${L.title}</summary>
    <div class="pie-wrap">
      <svg viewBox="0 0 42 42" class="pie" role="img" aria-label="${L.title}">
        <circle r="${R}" cx="21" cy="21" fill="none" stroke="var(--line)" stroke-width="6"></circle>${arcs}
        <text x="21" y="20.5" text-anchor="middle" class="pie-n">${total}</text>
        <text x="21" y="26" text-anchor="middle" class="pie-l">${L.total}</text>
      </svg>
      <div class="pie-legend">${rows}<div class="pie-row pie-total"><i></i><span>${L.total}</span><b>${total}</b><span></span></div></div>
    </div>
    <div class="muted small mt-8">${L.hint}</div>
  </details>`;
}
