import { S } from './state.js?v=202611131500';

// Arabic voice of the browser / OS (Maged, Tarik, Laila, Google العربية…). Never reads with a foreign voice.
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
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

export function speakAsync(text) {
  return new Promise(resolve => {
    if (!('speechSynthesis' in window)) return resolve();
    speak(text);
    const t = setInterval(() => { if (!window.speechSynthesis.speaking) { clearInterval(t); resolve(); } }, 200);
  });
}
