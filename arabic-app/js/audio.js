import { S } from './state.js?v=202611140100';

// Arabic voice of the browser / OS (Maged, Tarik, Laila, Google العربية…). Never reads with a foreign voice.
// Playback speed chosen in Settings (or with the speed chip in the reader): 0.25× … 2×.
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
export const speed = () => { const r = +(S.settings?.rate); return SPEEDS.includes(r) ? r : 1; };

export function stop() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function voice() {
  const vs = window.speechSynthesis.getVoices().filter(v => /^ar([-_]|$)/i.test(v.lang));
  return vs.find(v => /Maged|Tarik|Laila|Majed|Google|Hamed|Zariyah/i.test(v.name)) || vs[0] || null;
}

export function speak(text) {
  if (!text || S.settings?.sound === false || !('speechSynthesis' in window)) return;
  stop();
  const u = new SpeechSynthesisUtterance(String(text).replace(/^[^:：\n]{1,14}[:：]/gm, ''));
  const v = voice();
  if (v) u.voice = v;
  u.lang = 'ar-SA';
  u.rate = 0.85 * speed();
  window.speechSynthesis.speak(u);
}

export function speakAsync(text) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();
    speak(text);
    const t = setInterval(() => { if (!window.speechSynthesis.speaking) { clearInterval(t); resolve(); } }, 200);
  });
}
