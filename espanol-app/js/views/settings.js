import { S, update, reset } from '../state.js';
import { register, go } from '../router.js';
import { bottomNav, header } from '../ui/components.js';
import { t } from '../i18n.js';
import { isConfigured, getUser, logoutUser } from '../firebase-auth.js';

register('settings', (el) => {
  const langs = [
    { id: 'en', label: 'English' },
    { id: 'zh', label: '中文' },
    { id: 'ja', label: '日本語' },
  ];

  const user = isConfigured() ? getUser() : null;

  const accountSection = isConfigured() ? `
    <div class="card" style="padding:20px;margin-bottom:16px">
      <div class="h3 mb-16">${t('account')}</div>
      ${user ? `
        <div class="muted small mb-12">${t('loggedInAs')} ${user.email}</div>
        <div class="muted small mb-12" style="color:var(--yes)">✓ ${t('synced')}</div>
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
      <div class="h3 mb-16">${t('sourceLang')}</div>
      <div class="flex gap-8">
        ${langs.map(l => `
          <button class="chip ${S.lang === l.id ? 'on' : ''}" onclick="window.__setLang('${l.id}')">${l.label}</button>
        `).join('')}
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
    </div>

    <div class="card" style="padding:20px">
      <div class="h3 mb-16">${t('data')}</div>
      <div class="muted small mb-12">XP: ${S.xp} | ${t('streak')}: ${S.streak} | ${t('wordsSeen')}: ${Object.keys(S.vocab).length}</div>
      <button class="btn btn-ghost" style="color:var(--no);border-color:var(--no)" onclick="window.__resetData()">${t('resetAll')}</button>
    </div>
  </div>${bottomNav('settings')}`;
});

window.__setLang = (lang) => {
  update({ lang });
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
    reset();
    location.reload();
  }
};

window.__goAuth = () => {
  go('auth', { mode: 'login' });
};

window.__logout = async () => {
  try {
    await logoutUser();
    go('settings');
  } catch (e) {}
};
