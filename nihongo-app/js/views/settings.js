import { S, update, reset, flushCloud, syncInfo } from '../state.js?v=202611141000';
import { speak, SPEEDS, speed, G, SAMPLE, langVoices, deviceVoiceName, setDeviceVoice } from '../audio.js?v=202611141000';
import { readAnki } from '../anki-import.js?v=202611141000';
import { allVocab } from './review.js?v=202611141000';
import { voiceSettings, wireVoiceSettings } from '../voice-settings.js?v=202611141000';
import { esc } from '../ja.js?v=202611141000';
import { register, go } from '../router.js?v=202611141000';
import { bottomNav, header } from '../ui/components.js?v=202611141000';
import { t } from '../i18n.js?v=202611141000';
import { applyPinyinPref } from '../ja.js?v=202611141000';
import { isConfigured, getUser, logoutUser, loadStateFromCloud } from '../firebase-auth.js?v=202611141000';

register('settings', (el) => {
  const langs = [
    { id: 'es', label: 'Español' },
    { id: 'en', label: 'English' },
    { id: 'ko', label: '한국어' },
  ];

  const user = isConfigured() ? getUser() : null;

  const accountSection = isConfigured() ? `
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-16">${t('account')}</div>
      ${user ? `
        <div class="muted small mb-12">${t('loggedInAs')} ${user.email}</div>
        <div class="small mb-12" id="sync-status">${syncLine()}</div>
        <button class="btn btn-soft btn-small mb-12" onclick="window.__syncNow(this)">☁️ ${t('syncNow')}</button>
        <button class="btn btn-ghost" onclick="window.__logout()">${t('logout')}</button>
      ` : `
        <div class="muted small mb-12">${t('continueWithout')}</div>
        <button class="btn btn-primary" style="width:100%" onclick="window.__goAuth()">${t('login')} / ${t('createAccount')}</button>
      `}
    </div>
  ` : '';

  el.innerHTML = `<div class="fade">
    ${header(t('settings'))}

    ${accountSection}

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-16">${t('yourName')}</div>
      <div class="flex gap-8">
        <input id="settings-name" type="text" maxlength="30" value="${(S.name || '').replace(/"/g, '&quot;')}" placeholder="${t('namePlaceholder')}">
        <button class="btn btn-small" onclick="window.__saveSettingsName()">${t('save')}</button>
      </div>
    </div>

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-16">${t('sourceLang')}</div>
      <div class="flex gap-8">
        ${langs.map(l => `
          <button class="chip ${S.lang === l.id ? 'on' : ''}" onclick="window.__setLang('${l.id}')">${l.label}</button>
        `).join('')}
      </div>
    </div>

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-16">ふりがな · Furigana</div>
      <div class="flex items-center justify-between">
        <span>${t('showPinyin')}</span>
        <div class="toggle ${S.pinyin !== false ? 'on' : ''}" onclick="window.__togglePinyin()"></div>
      </div>
    </div>

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-16">${t('appearance')}</div>
      <div class="flex items-center justify-between">
        <span>${t('darkMode')}</span>
        <div class="toggle ${S.dark ? 'on' : ''}" onclick="window.__toggleDark()"></div>
      </div>
    </div>

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-16">${t('sound')}</div>
      <div class="flex items-center justify-between">
        <span>${t('soundFx')}</span>
        <div class="toggle ${S.settings.sound ? 'on' : ''}" onclick="window.__toggleSound()"></div>
      </div>
      <div class="mt-16">
        <div class="mb-8">${t('audioSpeed')}</div>
        <div class="flex gap-8" style="flex-wrap:wrap">${SPEEDS.map(r => `<button class="chip ${speed() === r ? 'on' : ''}" onclick="window.__setRate(${r})">×${r}</button>`).join('')}</div>
      </div>
      ${voiceSettings({ t, esc, G, voices: langVoices(), dvoice: deviceVoiceName() })}
    </div>

    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-8">📥 ${t('ankiImport')}</div>
      <div class="muted small mb-12">${t('ankiImportHint')}</div>
      <label class="btn btn-small" style="display:inline-block;cursor:pointer">📂 ${t('ankiChoose')}<input type="file" accept=".apkg,.colpkg" style="display:none" onchange="window.__ankiImport(this.files[0])"></label>
      <div id="anki-res" class="small mt-12"></div>
    </div>

    <div class="card" style="padding:20px">
      <div class="h3 mb-16">${t('data')}</div>
      <div class="muted small mb-12">XP: ${S.xp} | ${t('streak')}: ${S.streak} | ${t('wordsSeen')}: ${Object.keys(S.vocab).length}</div>
      <button class="btn btn-ghost" style="color:var(--no);border-color:var(--no)" onclick="window.__resetData()">${t('resetAll')}</button>
    </div>
  </div>${bottomNav('settings')}`;
});

window.__saveSettingsName = () => {
  const name = document.getElementById('settings-name').value.trim();
  if (name) { update({ name }); go('settings'); }
};

window.__setLang = (lang) => {
  update({ lang });
  go('settings');
};

window.__togglePinyin = () => {
  update({ pinyin: S.pinyin === false });
  applyPinyinPref();
  go('settings');
};

window.__toggleDark = () => {
  S.dark = !S.dark;
  document.body.classList.toggle('dark', S.dark);
  update({ dark: S.dark });
  go('settings');
};

window.__toggleSound = () => {
  S.settings.sound = !S.settings.sound;
  update({ settings: S.settings });
  go('settings');
};

window.__resetData = () => {
  if (confirm(t('confirmReset'))) {
    const uid = S.uid;
    reset();
    if (uid) S.uid = uid;
    flushCloud().then(() => location.reload());
  }
};

window.__goAuth = () => {
  go('auth', { mode: 'login' });
};

function syncLine() {
  const u = getUser();
  if (u && !u.emailVerified) return `<span style="color:var(--no)">✗ ${t('syncNotVerified')}</span>`;
  if (syncInfo.err) return `<span style="color:var(--no)">✗ ${syncInfo.err}</span>`;
  if (syncInfo.ok) return `<span style="color:var(--yes)">✓ ${t('synced')} · ${new Date(syncInfo.ok).toLocaleTimeString()}</span>`;
  return `<span class="muted">${t('syncPending')}</span>`;
}

// Uploads now and reads the copy back, so the user sees what the cloud actually holds.
window.__syncNow = async (btn) => {
  btn.disabled = true;
  const el = document.getElementById('sync-status');
  await flushCloud();
  let extra = '';
  try {
    const c = await loadStateFromCloud();
    extra = c ? ` · ☁️ ${c.xp || 0} XP, ${Object.keys(c.completed || {}).length} ${t('lessons')}` : ' · ☁️ ∅';
  } catch (e) { syncInfo.err = e.code || e.message; }
  if (el) el.innerHTML = syncLine() + extra;
  btn.disabled = false;
};

window.__logout = async () => {
  try {
    await flushCloud();
    await logoutUser();
    reset();
    location.reload();
  } catch (e) {}
};

window.__setRate = (r) => {
  S.settings.rate = r;
  update({ settings: S.settings });
  speak('こんにちは、ようこそ。');
  go('settings');
};

wireVoiceSettings({ t, G, speak, sample: SAMPLE, rerender: () => go('settings'), setDeviceVoice });
// Voices load asynchronously in some browsers: refresh the list once they arrive.
if ('speechSynthesis' in window) window.speechSynthesis.addEventListener?.('voiceschanged', () => { if (document.getElementById('voice-settings') && !document.getElementById('tts-dv') && !document.getElementById('tts-key')) go('settings'); });

// Import of an Anki deck: every card keeps its Anki state, interval and next review date.
window.__ankiImport = async (file) => {
  const box = document.getElementById('anki-res');
  if (!file || !box) return;
  const say = (h) => { box.innerHTML = h; };
  const steps = { libs: t('ankiStepLibs'), unzip: t('ankiStepUnzip'), read: t('ankiStepRead'), match: t('ankiStepMatch') };
  try {
    const vocab = await allVocab();
    S.cards ||= {};
    const r = await readAnki(file, { lang: 'ja', vocab, cards: S.cards, onStep: k => say('⏳ ' + steps[k]) });
    update({ cards: S.cards });
    const a = r.anki;
    say(`<div class="note-box">✓ <b>${t('ankiDone')}</b><br>
      Anki: ${a.total} · ${t('ankiNew')} ${a.new} · ${t('ankiLearn')} ${a.learn} · ${t('ankiRelearn')} ${a.relearn} · ${t('ankiYoung')} ${a.young} · ${t('ankiMature')} ${a.mature}<br>
      ${t('ankiMatched').replace('{n}', r.matched).replace('{t}', a.total)} · ${t('ankiAdded').replace('{n}', r.added)}${r.kept ? ' · ' + t('ankiKept').replace('{n}', r.kept) : ''}
      ${r.missing.length ? `<details class="mt-8"><summary>${t('ankiMissing').replace('{n}', r.missing.length)}</summary><div class="muted">${r.missing.slice(0, 400).map(esc).join(' · ')}</div></details>` : ''}
      <div class="mt-8"><button class="btn btn-small" onclick="window.__go('review',{deck:'v'})">🗂️ ${t('ankiGoDeck')}</button></div></div>`);
  } catch (e) {
    say(`<div class="note-box" style="color:var(--no)">✗ ${e.message === 'lib' ? t('ankiErrLib') : e.message === 'empty' ? t('ankiErrEmpty') : t('ankiErrFormat')}</div>`);
    console.error(e);
  }
};
