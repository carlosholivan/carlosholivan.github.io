// Optional English meaning under the Spanish one on vocabulary cards and word lists (Settings › "Show English too").
import { S } from './state.js?v=202611141800';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const on = m => S.lang === 'es' && S.showEn && m && m.en && m.en !== m.es;
export const enLine = m => (on(m) ? `<div class="mean-en">🇬🇧 ${esc(m.en)}</div>` : '');
export const enInline = m => (on(m) ? `<span class="mean-en-i"> · ${esc(m.en)}</span>` : '');
