import { S } from './state.js?v=202611130700';

// Japanese voice of the browser / OS (Kyoko, Otoya, Google 日本語…). Never reads with a foreign voice.
export function stop() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

function voice() {
  const vs = window.speechSynthesis.getVoices().filter(v => /^ja([-_]|$)/i.test(v.lang));
  return vs.find(v => /Kyoko|Otoya|Google|Nanami|Haruka/i.test(v.name)) || vs[0] || null;
}

export function speak(text) {
  if (!text || S.settings?.sound === false || !('speechSynthesis' in window)) return;
  stop();
  const u = new SpeechSynthesisUtterance(String(text).replace(/^[^：\n]{1,8}：/gm, ''));
  const v = voice();
  if (v) u.voice = v;
  u.lang = 'ja-JP';
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
