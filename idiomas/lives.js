// The "out of lives" sheet, shared by every language app. Like Duolingo, with no lives left you cannot START a new
// lesson, challenge or game, but the app never throws you out: you can earn a life by reviewing (5 right answers =
// 1 life), refill them all with gems, wait (1 every 20 min), or keep using everything that is free (reviews,
// texts, vocabulary, culture, the map). A lesson already started can always be finished.

const T = {
  es: { title: '¡Sin {n}!', sub: 'Para empezar algo nuevo necesitas al menos {i}. No pasa nada: tienes varias formas de seguir.',
    practice: 'Repasa y gana {i}', practiceSub: '5 aciertos repasando = +1 {i} ({k}/5)', refill: 'Rellenar todos', refillSub: 'Gasta {c} 💎 (tienes {g})',
    wait: '+1 {i} en {m} min', free: 'Seguir con lo gratis', freeSub: 'Repaso, textos, vocabulario y cultura no gastan nada', no: 'Te faltan 💎' },
  en: { title: 'Out of {n}!', sub: 'You need at least one {i} to start something new. No problem: there are several ways to keep going.',
    practice: 'Review to earn {i}', practiceSub: '5 right answers in review = +1 {i} ({k}/5)', refill: 'Refill them all', refillSub: 'Spend {c} 💎 (you have {g})',
    wait: '+1 {i} in {m} min', free: 'Keep going with free stuff', freeSub: 'Reviews, texts, vocabulary and culture cost nothing', no: 'Not enough 💎' },
};

// opt: { lang, icon, name, minutes, gems, cost, earned (0-4), onPractice, onRefill() -> bool, onFree, onClose }
export function showGate(opt) {
  const t = T[opt.lang === 'en' ? 'en' : 'es'];
  const f = s => s.replace(/\{i\}/g, opt.icon).replace(/\{n\}/g, opt.name).replace('{m}', opt.minutes).replace('{c}', opt.cost).replace('{g}', opt.gems).replace('{k}', opt.earned || 0);
  document.querySelector('.lg-back')?.remove();
  const d = document.createElement('div');
  d.className = 'lg-back';
  d.innerHTML = `<div class="lg-sheet" role="dialog" aria-modal="true">
    <div class="lg-icons">${Array.from({ length: 5 }, () => `<span>${opt.icon}</span>`).join('')}</div>
    <h3>${f(t.title)}</h3><p>${f(t.sub)}</p>
    <button class="lg-opt lg-a" data-k="practice"><b>💬 ${f(t.practice)}</b><small>${f(t.practiceSub)}</small><i style="width:${(opt.earned || 0) * 20}%"></i></button>
    <button class="lg-opt lg-b" data-k="refill" ${opt.gems < opt.cost ? 'disabled' : ''}><b>💎 ${f(t.refill)}</b><small>${opt.gems < opt.cost ? t.no + ' · ' : ''}${f(t.refillSub)}</small></button>
    <button class="lg-opt lg-c" data-k="free"><b>📖 ${f(t.free)}</b><small>${f(t.freeSub)}</small></button>
    <div class="lg-wait">⏳ ${f(t.wait)}</div>
    <button class="lg-x" aria-label="Cerrar">✕</button></div>`;
  if (!document.getElementById('lg-css')) document.head.insertAdjacentHTML('beforeend', `<style id="lg-css">${CSS}</style>`);
  document.body.appendChild(d);
  const close = () => d.remove();
  d.onclick = e => { if (e.target === d) { close(); opt.onClose && opt.onClose(); } };
  d.querySelector('.lg-x').onclick = () => { close(); opt.onClose && opt.onClose(); };
  d.querySelectorAll('.lg-opt').forEach(b => b.onclick = () => {
    const k = b.dataset.k;
    if (k === 'refill') { if (opt.onRefill()) close(); return; }
    close();
    (k === 'practice' ? opt.onPractice : opt.onFree)();
  });
}

const CSS = `
.lg-back{position:fixed;inset:0;z-index:9000;background:rgba(8,12,30,.55);display:flex;align-items:flex-end;justify-content:center;animation:lgFade .2s}
.lg-sheet{position:relative;width:100%;max-width:480px;background:#fffaf2;color:#2b2340;border-radius:26px 26px 0 0;padding:22px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.35);animation:lgUp .3s cubic-bezier(.2,1.2,.4,1)}
.lg-sheet h3{margin:6px 0 4px;font-size:22px;text-align:center}.lg-sheet p{margin:0 0 14px;text-align:center;color:#6b5f52;line-height:1.45;font-size:14.5px}
.lg-icons{text-align:center;font-size:30px;letter-spacing:4px;filter:grayscale(1);opacity:.4}
.lg-opt{position:relative;overflow:hidden;display:block;width:100%;text-align:left;border:0;border-radius:16px;padding:12px 14px;margin-bottom:9px;cursor:pointer;border-bottom:4px solid rgba(0,0,0,.15)}
.lg-opt b{display:block;font-size:16px}.lg-opt small{display:block;font-size:12.5px;opacity:.85;margin-top:2px}
.lg-opt i{position:absolute;left:0;bottom:0;height:4px;background:#fff;opacity:.8}
.lg-a{background:linear-gradient(90deg,#3ddc97,#4cc9f0);color:#fff}.lg-b{background:linear-gradient(90deg,#b388ff,#ff8fab);color:#fff}.lg-b:disabled{filter:grayscale(.7);opacity:.6;cursor:default}
.lg-c{background:#f1e8d8;color:#2b2340}
.lg-wait{text-align:center;font-size:13px;color:#8a7c6c;margin-top:4px}
.lg-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;border:0;background:#efe5d4;color:#6b5f52;cursor:pointer}
@keyframes lgUp{from{transform:translateY(100%)}}@keyframes lgFade{from{opacity:0}}`;
