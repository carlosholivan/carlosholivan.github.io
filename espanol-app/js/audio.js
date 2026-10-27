import { S } from './state.js';

// Pre-generated MP3s (tools/generate_audio.py); browser TTS is only a fallback and
// only with a Spanish voice, so text is never read with an English accent.
let index = null;
const ready = fetch('data/audio/index.json')
  .then(r => (r.ok ? r.json() : {}))
  .catch(() => ({}))
  .then(d => { index = d; });

let player = null;

export function stop() {
  if (player) { player.pause(); player = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speak(text) {
  if (!text || S.settings?.sound === false) return;
  const key = String(text).trim();
  stop();
  const play = () => {
    const file = index[key];
    if (file) {
      player = new Audio(`data/audio/${file}`);
      player.play().catch(() => {});
    } else {
      speakWithBrowser(key);
    }
  };
  if (index) play(); else ready.then(play);
}

function speakWithBrowser(text) {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices().filter(v => /^es([-_]|$)/i.test(v.lang));
  const voice = voices.find(v => /es[-_]ES/i.test(v.lang)) || voices[0];
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}
