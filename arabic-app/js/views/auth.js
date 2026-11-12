import { register as registerView, go } from '../router.js?v=202611130800';
import { header } from '../ui/components.js?v=202611130800';
import { t } from '../i18n.js?v=202611130800';
import { registerUser, loginUser, resetPassword, getUser, sendVerification, refreshVerified, logoutUser } from '../firebase-auth.js?v=202611130800';
import { update } from '../state.js?v=202611130800';
import { enterApp } from './welcome.js?v=202611130800';

let authMode = 'login';

registerView('auth', (el, params = {}) => {
  authMode = params.mode || 'login';
  const isLogin = authMode === 'login';

  el.innerHTML = `<div class="fade">
    ${header(isLogin ? t('login') : t('createAccount'), true)}

    <div class="card" style="padding:24px;margin-bottom:16px">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:48px;margin-bottom:8px">📚</div>
        <div class="h2">日本語 · Japonés</div>
        <div class="muted small">${isLogin ? t('loginSubtitle') : t('registerSubtitle')}</div>
      </div>

      <div id="auth-error" style="display:none;color:var(--no);background:var(--no-bg);padding:10px;border-radius:8px;margin-bottom:12px;font-size:14px"></div>

      ${isLogin ? '' : `<label class="muted small" style="display:block;margin-bottom:4px">${t('yourName')}</label>
      <input id="auth-name" type="text" maxlength="30" autocomplete="given-name" placeholder="${t('namePlaceholder')}"
        style="width:100%;padding:12px;border:2px solid var(--border);border-radius:10px;font-size:16px;margin-bottom:12px;box-sizing:border-box;background:var(--bg);color:var(--text)">`}

      <label class="muted small" style="display:block;margin-bottom:4px">${t('email')}</label>
      <input id="auth-email" type="email" placeholder="email@example.com"
        style="width:100%;padding:12px;border:2px solid var(--border);border-radius:10px;font-size:16px;margin-bottom:12px;box-sizing:border-box;background:var(--bg);color:var(--text)">

      <label class="muted small" style="display:block;margin-bottom:4px">${t('password')}</label>
      <input id="auth-pass" type="password" placeholder="••••••••"
        style="width:100%;padding:12px;border:2px solid var(--border);border-radius:10px;font-size:16px;margin-bottom:16px;box-sizing:border-box;background:var(--bg);color:var(--text)">

      <button id="auth-submit" class="btn btn-primary" style="width:100%;padding:14px;font-size:16px" onclick="window.__authSubmit()">
        ${isLogin ? t('login') : t('createAccount')}
      </button>

      ${isLogin ? `<div style="text-align:center;margin-top:12px">
        <a href="#" onclick="window.__forgotPass();return false" style="color:var(--accent);font-size:14px">${t('forgotPassword')}</a>
      </div>` : ''}

      <div style="text-align:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
        <span class="muted small">${isLogin ? t('noAccount') : t('hasAccount')}</span>
        <a href="#" onclick="window.__switchAuth();return false" style="color:var(--accent);font-size:14px;margin-left:4px">
          ${isLogin ? t('createAccount') : t('login')}
        </a>
      </div>
    </div>

    <div style="text-align:center">
      <a href="#" onclick="window.__skipAuth();return false" class="muted small">${t('continueWithout')}</a>
    </div>
  </div>`;
});

window.__authSubmit = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const nameEl = document.getElementById('auth-name');
  const name = nameEl ? nameEl.value.trim() : null;
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit');

  if (!email || !pass || name === '') {
    errEl.textContent = t('fillFields');
    errEl.style.display = 'block';
    return;
  }
  if (pass.length < 6) {
    errEl.textContent = t('passwordMin');
    errEl.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.textContent = '...';
  errEl.style.display = 'none';

  try {
    if (authMode === 'login') {
      await loginUser(email, pass);
    } else {
      update({ name, welcomed: false });
      await registerUser(email, pass);
    }
  } catch (e) {
    btn.disabled = false;
    btn.textContent = authMode === 'login' ? t('login') : t('createAccount');
    const code = e.code || '';
    const messages = {
      'auth/email-already-in-use': t('emailInUse'),
      'auth/invalid-email': t('invalidEmail'),
      'auth/weak-password': t('weakPassword'),
      'auth/user-not-found': t('userNotFound'),
      'auth/wrong-password': t('wrongPassword'),
      'auth/invalid-credential': t('wrongPassword'),
      'auth/too-many-requests': t('tooManyRequests')
    };
    errEl.textContent = messages[code] || e.message;
    errEl.style.display = 'block';
  }
};

window.__switchAuth = () => {
  go('auth', { mode: authMode === 'login' ? 'register' : 'login' });
};

window.__forgotPass = async () => {
  const email = document.getElementById('auth-email').value.trim();
  const errEl = document.getElementById('auth-error');
  if (!email) {
    errEl.textContent = t('enterEmail');
    errEl.style.display = 'block';
    return;
  }
  try {
    await resetPassword(email);
    errEl.style.cssText = 'display:block;color:var(--ok)';
    errEl.textContent = t('resetSent');
  } catch (e) {
    errEl.textContent = t('userNotFound');
    errEl.style.display = 'block';
  }
};

window.__skipAuth = () => {
  enterApp();
};

registerView('verify', (el) => {
  const email = (getUser() || {}).email || '';
  el.innerHTML = `<div class="fade">
    <div class="card" style="padding:24px;margin-top:24px;text-align:center">
      <div style="font-size:48px;margin-bottom:8px">✉️</div>
      <div class="h2 mb-8">${t('verifyTitle')}</div>
      <div class="muted mb-16">${t('verifySent').replace('{e}', `<b>${email.replace(/[<>&"]/g, '')}</b>`)}</div>
      <div id="verify-msg" class="small mb-12" style="display:none"></div>
      <button class="btn btn-primary" style="width:100%;padding:14px;font-size:16px" onclick="window.__verifyCheck(this)">${t('verifyDone')}</button>
      <button class="btn btn-ghost mt-12" style="width:100%" onclick="window.__verifyResend(this)">${t('verifyResend')}</button>
      <a href="#" class="muted small" style="display:inline-block;margin-top:16px" onclick="window.__verifyLogout();return false">${t('logout')}</a>
    </div>
  </div>`;
});

function verifyMsg(text, ok) {
  const m = document.getElementById('verify-msg');
  if (!m) return;
  m.style.cssText = `display:block;color:var(${ok ? '--ok' : '--no'})`;
  m.textContent = text;
}

window.__verifyCheck = async (btn) => {
  btn.disabled = true;
  try {
    if (await refreshVerified()) return window.__signedIn(getUser());
    verifyMsg(t('verifyNotYet'), false);
  } catch (e) { verifyMsg(e.message, false); }
  btn.disabled = false;
};

window.__verifyResend = async (btn) => {
  btn.disabled = true;
  try { await sendVerification(); verifyMsg(t('verifyResent'), true); }
  catch (e) { verifyMsg(e.code === 'auth/too-many-requests' ? t('tooManyRequests') : e.message, false); }
  setTimeout(() => { btn.disabled = false; }, 30000);
};

window.__verifyLogout = async () => {
  await logoutUser();
  go('auth', { mode: 'login' });
};

// Coming back to the tab after clicking the link: check automatically.
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState !== 'visible' || !document.getElementById('verify-msg')) return;
  try { if (await refreshVerified()) window.__signedIn(getUser()); } catch (e) {}
});
