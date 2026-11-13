import { S } from './state.js?v=202611132200';

// Two engines:
//  · device — the Japanese voice of the browser / OS. The best one available is picked automatically
//    (neural "Natural/Online" voices, then enhanced/premium ones…) unless the user chooses one in Settings.
//  · gemini — natural AI voice (Gemini TTS) with the user's own API key. The key stays in this browser
//    (localStorage, never synced to the cloud) and every clip is cached in IndexedDB, so each word is
//    generated only once. Any failure falls back to the device voice.
// Playback speed chosen in Settings or in the reader: 0.25× … 2×.
export const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
export const speed = () => { const r = +(S.settings?.rate); return SPEEDS.includes(r) ? r : 1; };

const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { return null; } };
export const tts = {
  get engine() { return LS('nh_tts_engine') === 'gemini' && this.key ? 'gemini' : 'device'; },
  set engine(v) { LS('nh_tts_engine', v); },
  get key() { return LS('nh_gemini_key') || ''; },
  set key(v) { LS('nh_gemini_key', v ? v.trim() : null); },
  get gvoice() { return LS('nh_gemini_voice') || 'Kore'; },
  set gvoice(v) { LS('nh_gemini_voice', v); },
  get dvoice() { return LS('nh_device_voice') || ''; },
  set dvoice(v) { LS('nh_device_voice', v || null); },
};
export const GEMINI_VOICES = ['Kore', 'Aoede', 'Leda', 'Puck', 'Charon', 'Fenrir', 'Orus', 'Zephyr'];
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'];

let audio = null;
export function stop() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (audio) { audio.pause(); audio = null; }
}

// ---------- device voice ----------
export function jaVoices() {
  if (!('speechSynthesis' in window)) return [];
  const score = v => (/Natural|Online|Neural/i.test(v.name) ? 0 : /Premium|Enhanced|mejorada|Siri/i.test(v.name) ? 1
    : /Google/i.test(v.name) ? 2 : /Nanami|Keita|Kyoko|Otoya|Haruka|Ayumi|Ichiro|Sayaka/i.test(v.name) ? 3 : 4);
  return window.speechSynthesis.getVoices().filter(v => /^ja([-_]|$)/i.test(v.lang)).sort((a, b) => score(a) - score(b));
}
function voice() {
  const vs = jaVoices();
  return vs.find(v => v.name === tts.dvoice) || vs[0] || null;
}
function deviceSpeak(text, onend) {
  if (!('speechSynthesis' in window)) return onend && onend();
  const u = new SpeechSynthesisUtterance(text);
  const v = voice();
  if (v) u.voice = v;
  u.lang = 'ja-JP';
  u.rate = 0.85 * speed();
  if (onend) {
    let fired = false; const end = () => { if (!fired) { fired = true; clearInterval(iv); onend(); } };
    u.onend = u.onerror = end;
    // Some browsers never fire onend: poll as a safety net.
    const iv = setInterval(() => { if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) end(); }, 300);
  }
  window.speechSynthesis.speak(u);
}

// ---------- Gemini voice ----------
let dbp = null;
const db = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open('nihongo_tts', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('clips');
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const idb = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const q = fn(d.transaction('clips', mode).objectStore('clips')); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); };

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function wav(pcm, rate = 24000) {
  const h = new DataView(new ArrayBuffer(44)), w = (o, s) => [...s].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true);
  h.setUint16(20, 1, true); h.setUint16(22, 1, true); h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true);
  h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
  return new Blob([h, pcm], { type: 'audio/wav' });
}
const pending = new Map();
async function geminiClip(text) {
  const id = tts.gvoice + '|' + text;
  const hit = await idb('readonly', s => s.get(id)).catch(() => null);
  if (hit) return hit;
  if (pending.has(id)) return pending.get(id);
  const job = (async () => {
    let lastErr;
    for (const model of MODELS) {
      for (const voiceConfig of [{ voice: tts.gvoice }, { prebuiltVoiceConfig: { voiceName: tts.gvoice } }]) {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': tts.key },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }],
            generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig } } }),
        });
        if (r.status === 401 || r.status === 403) throw new Error('key');
        if (!r.ok) { lastErr = new Error(r.status + ''); continue; }
        const part = (await r.json())?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part) { lastErr = new Error('empty'); continue; }
        const bytes = b64(part.inlineData.data), mt = part.inlineData.mimeType || '';
        const isWav = bytes[0] === 0x52 && bytes[1] === 0x49; // "RI"FF
        const blob = isWav ? new Blob([bytes], { type: 'audio/wav' }) : wav(bytes, +(mt.match(/rate=(\d+)/) || [])[1] || 24000);
        idb('readwrite', s => s.put(blob, id)).catch(() => {});
        return blob;
      }
    }
    throw lastErr || new Error('tts');
  })();
  pending.set(id, job);
  try { return await job; } finally { pending.delete(id); }
}
function playBlob(blob, onend) {
  const a = new Audio(URL.createObjectURL(blob));
  a.playbackRate = speed();
  a.preservesPitch = true;
  a.onended = a.onerror = () => { URL.revokeObjectURL(a.src); if (audio === a) audio = null; onend && onend(); };
  audio = a;
  return a.play();
}
export async function testGemini() { return geminiClip('こんにちは。日本語の勉強、がんばりましょう。'); }

// ---------- public ----------
const clean = text => String(text).replace(/^[^：\n]{1,8}：/gm, '');
let token = 0;
function play(text, onend) {
  text = clean(text);
  const my = ++token;
  if (tts.engine === 'gemini') {
    geminiClip(text)
      .then(b => { if (my === token) return playBlob(b, onend); })
      .catch(() => { if (my === token) deviceSpeak(text, onend); });
  } else {
    const kana = /[\u4e00-\u9fff々]/.test(text) && text.length <= 8 && window.__jaReading?.(text);
    deviceSpeak(kana || text, onend);
  }
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
