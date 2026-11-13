// "Voice" block of the Settings screen, shared by the three apps.
// opts: { t, esc, G (gemini() object), voices: SpeechSynthesisVoice[] | null (null = app has recorded audio),
//         dvoice: chosen device voice name, sample: text used by the Test button }
export function voiceSettings({ t, esc, G, voices, dvoice }) {
  const gem = G.on;
  const device = voices === null
    ? `<div class="muted small">${t('ttsRecordedHint')}</div>`
    : voices.length ? `
      <select id="tts-dv" class="vl-search" style="width:100%;margin-bottom:8px" onchange="window.__ttsDVoice(this.value)">
        <option value="">${t('ttsAuto')} — ${esc(voices[0].name)}</option>
        ${voices.map(v => `<option value="${esc(v.name)}" ${dvoice === v.name ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
      </select>
      <div class="muted small mt-8">${t('ttsDeviceHint')}</div>`
    : `<div class="muted small">${t('ttsNoVoice')}</div><div class="muted small mt-8">${t('ttsDeviceHint')}</div>`;
  return `<div class="mt-16" id="voice-settings">
    <div class="mb-8">${t('ttsVoice')}</div>
    <div class="flex gap-8 mb-8" style="flex-wrap:wrap">
      <button class="chip ${gem ? '' : 'on'}" onclick="window.__ttsEngine(false)">${voices === null ? '🎧 ' + t('ttsRecorded') : '📱 ' + t('ttsDevice')}</button>
      <button class="chip ${gem ? 'on' : ''}" onclick="window.__ttsEngine(true)">✨ ${t('ttsGemini')}</button>
    </div>
    ${gem ? `
      <div class="muted small mb-8">${t('ttsGeminiHint')}</div>
      <ol class="muted small mb-8" style="padding-left:18px;line-height:1.6">${t('ttsSteps')}</ol>
      <div class="flex gap-8 mb-8">
        <input id="tts-key" type="password" class="vl-search" placeholder="${t('ttsKey')}" value="${esc(G.key)}" autocomplete="off" style="flex:1">
        ${G.key ? `<button class="btn btn-small btn-ghost" onclick="window.__ttsForget()">✖</button>` : ''}
      </div>
      <div class="flex gap-8 mb-8" style="flex-wrap:wrap">${['Kore', 'Aoede', 'Leda', 'Puck', 'Charon', 'Fenrir', 'Orus', 'Zephyr'].map(v => `<button class="chip ${G.voice === v ? 'on' : ''}" onclick="window.__ttsGVoice('${v}')">${v}</button>`).join('')}</div>`
    : device}
    <div class="mt-8"><button class="btn btn-small" onclick="window.__ttsTest()">▶ ${t('ttsTest')}</button> <span id="tts-res" class="small"></span></div>
  </div>`;
}

// Wires the handlers. rerender(): redraws the settings screen; speak(text); sample: test sentence.
export function wireVoiceSettings({ t, G, speak, sample, rerender, setDeviceVoice }) {
  window.__ttsEngine = (on) => { G.on = on; rerender(); };
  window.__ttsGVoice = (v) => { G.voice = v; rerender(); };
  window.__ttsDVoice = (v) => { setDeviceVoice(v); speak(sample); };
  window.__ttsForget = () => { G.key = ''; rerender(); };
  window.__ttsTest = async () => {
    const k = document.getElementById('tts-key');
    const r = document.getElementById('tts-res');
    if (k) {
      G.key = k.value;
      if (!G.key) { if (r) r.textContent = t('ttsFail'); return; }
      if (r) r.textContent = '…';
      try { await G.clip(sample); if (r) r.textContent = t('ttsOk'); }
      catch (e) { if (r) r.textContent = e.message === 'quota' ? t('ttsQuota') : t('ttsFail'); return; }
    }
    speak(sample);
  };
}
