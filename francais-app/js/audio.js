import { S } from './state.js?v=202611282014';
import { gemini, playBlob } from './gemini-tts.js?v=202611282014';

// Optional Gemini voice with the user's own key (gemini-tts.js). Falls back to the recordings.
export const G = gemini('fr', 'fr-FR');
export const SAMPLE = "Bonjour ! Comment ça va ? Apprenons le français ensemble.";

// Pre-generated MP3s (tools/generate_audio.py, edge-tts); browser TTS is only a fallback and
// only with a French voice, so text is never read with a foreign accent.
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
  gtoken++;
  if (player) { player.pause(); player = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

// Story mode: each character's own voice (data/audio/story.json, keyed "<who>|<text>"), else the usual voice.
let storyIdx = null;
const storyReady = fetch('data/audio/story.json').then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(d => { storyIdx = d; });
// A character's own pitch for words they have no recording of (kids higher, men and elders lower).
let tone = 1;
export function speakAs(who, text, k = 1) {
  if (!text || S.settings?.sound === false) return;
  const go = () => {
    const f = storyIdx && storyIdx[`${who}|${String(text).trim()}`];
    if (!f || G.active) { tone = k; return speak(text); }
    stop();
    player = new Audio(`data/audio/story/${f}`);
    player.playbackRate = speed();
    player.play().catch(() => speak(text));
  };
  storyIdx ? go() : storyReady.then(go);
}

export function speak(text) {
  if (!text || S.settings?.sound === false) return;
  const key = String(text).trim();
  stop();
  if (G.active) {
    const my = ++gtoken;
    G.clip(key).then(b => { if (my === gtoken) player = playBlob(b, speed()); })
      .catch(() => { if (my === gtoken) (index ? playRecorded(key) : ready.then(() => playRecorded(key))); });
    return;
  }
  const play = () => playRecorded(key);
  if (index) play(); else ready.then(play);
}
let gtoken = 0;

function playRecorded(key) {
  {
    const file = index[key];
    if (file) {
      player = new Audio(`data/audio/${file}`);
      player.playbackRate = speed();
      if (tone !== 1) { player.preservesPitch = false; player.playbackRate = speed() * tone; }
      tone = 1;
      player.play().catch(() => {});
    } else {
      speakWithBrowser(key);
    }
  }
}

function speakWithBrowser(text) {
  if (!('speechSynthesis' in window)) return;
  const voices = window.speechSynthesis.getVoices().filter(v => /^fr([-_]|$)/i.test(v.lang));
  const voice = voices.find(v => /fr[-_]FR/i.test(v.lang)) || voices[0];
  if (!voice) return;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.9 * speed();
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
