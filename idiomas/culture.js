// Culture of the country of each language (data in /idiomas/culture/<app>.json): festivals by date, shown as
// "today in Japan…" in the story map and as notifications in the Android app, and "did you know?" facts that
// the elders of each town tell. Shared by every language app.
const cache = {};
export const loadCulture = app => cache[app] || (cache[app] = fetch(new URL(`./culture/${app}.json`, import.meta.url)).then(r => (r.ok ? r.json() : null)).catch(() => null));
const md = d => `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function dateOf(day, year) { const s = day.y ? day.y[year] : day.d; return s ? new Date(`${year}-${s}T09:00:00`) : null; }
// Festivals in the next `days` days (0 = today), in order.
export function upcoming(c, days = 7, now = new Date()) {
  if (!c) return [];
  const out = [], t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const y of [now.getFullYear(), now.getFullYear() + 1]) for (const d of c.days || []) {
    const at = dateOf(d, y); if (!at) continue;
    const k = Math.round((new Date(at.getFullYear(), at.getMonth(), at.getDate()) - t0) / 86400000);
    if (k >= 0 && k <= days) out.push({ ...d, in: k, at });
  }
  return out.sort((a, b) => a.in - b.in);
}
export const today = c => upcoming(c, 0)[0] || null;
// The fact for a town on a given day: changes every day, different in each town.
export const factFor = (c, i, now = new Date()) => (c && c.facts && c.facts.length) ? { k: (i * 7 + Math.floor(now / 86400000)) % c.facts.length, t: c.facts[(i * 7 + Math.floor(now / 86400000)) % c.facts.length] } : null;
