import { register as registerView, go } from '../router.js';
import { header } from '../ui/components.js';
import { t } from '../i18n.js';
import { registerUser, loginUser, resetPassword } from '../firebase-auth.js';

let authMode = 'login';

registerView('auth', (el, params = {}) => {
  authMode = params.mode || 'login';
  const isLogin = authMode === 'login';

  el.innerHTML = `<div class="fade">
    ${header(isLogin ? t('login') : t('createAccount'), true)}

    <div class="card" style="padding:24px;margin-bottom:16px">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:48px;margin-bottom:8px">📚</div>
        <div class="h2">Español</div>
        <div class="muted small">${isLogin ? t('loginSubtitle') : t('registerSubtitle')}</div>
      </div>

      <div id="auth-error" style="display:none;color:var(--no);background:var(--no-bg);padding:10px;border-radius:8px;margin-bottom:12px;font-size:14px"></div>

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
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit');

  if (!email || !pass) {
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
    errEl.style.cssText = 'display:block;color:var(--yes)';
    errEl.textContent = t('resetSent');
  } catch (e) {
    errEl.textContent = t('userNotFound');
    errEl.style.display = 'block';
  }
};

window.__skipAuth = () => {
  go('home');
};
