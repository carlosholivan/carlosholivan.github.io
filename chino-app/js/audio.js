import { S } from './state.js?v=202611131500';

// Pre-generated MP3s (tools/generate_audio.py); browser TTS is only a fallback and
// only with a Mandarin voice, so text is never read with a foreign accent.
let index = null;
const ready = fetch('data/audio/index.json')
  .then(r => (r.ok ? r.json() : {}))
  .catch(() => ({}))
  .then(d => { index = d; });

let player = null;

// Playback speed chosen in Settings (or with the speed chip in the reader): 0.25× … 2×.
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
export const speed = () => { const r = +(S.settings?.rate); return SPEEDS.includes(r) ? r : 1; };

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
      player.playbackRate = speed();
      player.play().catch(() => {});
    } else {
      speakWithBrowser(key);
    }
  };
  if (index) play(); else ready.then(play);
}

function speakWithBrowser(text) {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices().filter(v => /^(zh|cmn)([-_]|$)/i.test(v.lang));
  const voice = voices.find(v => /(zh|cmn)[-_](CN|Hans)/i.test(v.lang)) || voices[0];
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.8 * speed();
  window.speechSynthesis.speak(u);
}

// Plays a text and resolves when it ends (used to chain the four tones of a syllable).
export function speakAsync(text) {
  return new Promise(resolve => {
    const key = String(text).trim();
    const go = () => {
      const file = index[key];
      if (!file) { speakWithBrowser(key); return setTimeout(resolve, 900); }
      stop();
      player = new Audio(`data/audio/${file}`);
      player.playbackRate = speed();
      player.onended = () => setTimeout(resolve, 150);
      player.onerror = resolve;
      player.play().catch(resolve);
    };
    if (index) go(); else ready.then(go);
  });
}
