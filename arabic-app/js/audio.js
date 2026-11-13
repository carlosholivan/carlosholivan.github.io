import { S } from './state.js?v=202611140230';
import { gemini, playBlob } from './gemini-tts.js?v=202611140230';

// Two engines:
//  · device — the Arabic voice of the browser / OS. The best one available is picked automatically
//    (neural "Natural/Online" voices first) unless the user chooses one in Settings. Never a foreign voice.
//  · gemini — natural AI voice with the user's own key (gemini-tts.js). Any failure falls back to the device voice.
// Playback speed chosen in Settings or in the reader: 0.25× … 2×.
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
export const speed = () => { const r = +(S.settings?.rate); return SPEEDS.includes(r) ? r : 1; };

const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { return null; } };
export const G = gemini('ar', 'ar-XA');
export const SAMPLE = 'مَرْحَبًا! هَيَّا نَتَعَلَّمُ العَرَبِيَّةَ مَعًا.';
export const deviceVoiceName = () => LS('ar_device_voice') || '';
export const setDeviceVoice = (v) => LS('ar_device_voice', v || null);

let audio = null;
export function stop() {
  token++;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (audio) { audio.pause(); audio = null; }
}

export function langVoices() {
  if (!('speechSynthesis' in window)) return [];
  const score = v => (/Natural|Online|Neural/i.test(v.name) ? 0 : /Premium|Enhanced|mejorada|Siri/i.test(v.name) ? 1
    : /Google/i.test(v.name) ? 2 : /Maged|Tarik|Laila|Majed|Hamed|Zariyah|Salma|Shakir/i.test(v.name) ? 3 : 4);
  return window.speechSynthesis.getVoices().filter(v => /^ar([-_]|$)/i.test(v.lang)).sort((a, b) => score(a) - score(b));
}
function voice() {
  const vs = langVoices();
  return vs.find(v => v.name === deviceVoiceName()) || vs[0] || null;
}
function deviceSpeak(text, onend) {
  if (!('speechSynthesis' in window)) return onend && onend();
  const u = new SpeechSynthesisUtterance(text);
  const v = voice();
  if (v) u.voice = v;
  u.lang = v?.lang || 'ar-SA';
  u.rate = 0.85 * speed();
  if (onend) {
    let fired = false; const end = () => { if (!fired) { fired = true; clearInterval(iv); onend(); } };
    u.onend = u.onerror = end;
    const iv = setInterval(() => { if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) end(); }, 300);
  }
  window.speechSynthesis.speak(u);
}

const clean = text => String(text).replace(/^[^:：\n]{1,14}[:：]/gm, '');
let token = 0;
function play(text, onend) {
  text = clean(text);
  const my = ++token;
  if (G.active) {
    G.clip(text)
      .then(b => { if (my === token) audio = playBlob(b, speed(), onend); })
      .catch(() => { if (my === token) deviceSpeak(text, onend); });
  } else deviceSpeak(text, onend);
}

export function speak(text) {
  if (!text || S.settings?.sound === false) return;
  stop();
  play(text);
}

export function speakAsync(text) {
  return new Promise(resolve => {
    if (!text || S.settings?.sound === false) return resolve();
    stop();
    let done = false;
    const end = () => { if (!done) { done = true; resolve(); } };
    play(text, end);
    setTimeout(end, 60000);
  });
}
