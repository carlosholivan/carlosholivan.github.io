// Gemini TTS (natural AI voice) with the user's own Google AI Studio key — shared by the three apps.
// The key lives only in this browser's localStorage. The three apps share the same origin
// (carlosholivan.github.io), so a key entered in one app works in all of them. It is never put in the
// synced app state, so it never reaches Firebase. Every clip is cached in IndexedDB: each text is
// generated once, then plays offline and for free.
const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { return null; } };

export const GEMINI_VOICES = ['Kore', 'Aoede', 'Leda', 'Puck', 'Charon', 'Fenrir', 'Orus', 'Zephyr'];
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview'];

// app: 'zh' | 'ja' | 'ar' | 'es' (engine and voice are chosen per app; the key is shared)
export const gemini = (app, langCode) => ({
  get key() { return LS('gemini_tts_key') || LS('nh_gemini_key') || ''; },
  set key(v) { LS('gemini_tts_key', v ? v.trim() : null); LS('nh_gemini_key', null); },
  get on() { return (LS(`tts_engine_${app}`) || (app === 'ja' ? LS('nh_tts_engine') : '')) === 'gemini'; },
  set on(v) { LS(`tts_engine_${app}`, v ? 'gemini' : 'device'); },
  get active() { return this.on && !!this.key; },
  get voice() { return LS(`gemini_voice_${app}`) || (app === 'ja' && LS('nh_gemini_voice')) || 'Kore'; },
  set voice(v) { LS(`gemini_voice_${app}`, v); },
  clip(text) { return clip(app, langCode, this.voice, this.key, text); },
});

let dbp = null;
const db = () => dbp || (dbp = new Promise((res, rej) => {
  const r = indexedDB.open('gemini_tts', 1);
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
async function clip(app, langCode, voice, key, text) {
  const id = `${app}|${voice}|${text}`;
  const hit = await idb('readonly', s => s.get(id)).catch(() => null);
  if (hit) return hit;
  if (!key) throw new Error('key');
  if (pending.has(id)) return pending.get(id);
  const job = (async () => {
    let lastErr;
    // The language is fixed so that a lone 手 or 学 is never read in the wrong language;
    // older API versions without these fields get the plainer request.
    const variants = [
      { voiceConfig: { voice }, languageCode: langCode },
      { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } }, languageCode: langCode },
      { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    ];
    for (const model of MODELS) {
      for (const speechConfig of variants) {
        let r;
        try {
          r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text }] }],
              generationConfig: { responseModalities: ['AUDIO'], speechConfig } }),
          });
        } catch (e) { throw new Error('net'); }
        if (r.status === 401 || r.status === 403) throw new Error('key');
        if (r.status === 429) throw new Error('quota');
        if (!r.ok) { lastErr = new Error(String(r.status)); continue; }
        const part = (await r.json())?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!part) { lastErr = new Error('empty'); continue; }
        const bytes = b64(part.inlineData.data), mt = part.inlineData.mimeType || '';
        const isWav = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46; // "RIF"F
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

// Plays a blob at the chosen speed; returns the <audio> element.
export function playBlob(blob, rate, onend) {
  const a = new Audio(URL.createObjectURL(blob));
  a.playbackRate = rate;
  a.preservesPitch = true;
  a.onended = a.onerror = () => { URL.revokeObjectURL(a.src); onend && onend(); };
  a.play().catch(() => onend && onend());
  return a;
}
