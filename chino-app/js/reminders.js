// Daily study reminders (Settings). Two ways, the learner can use both:
//  1. Push notifications on this device (Firebase Cloud Messaging). The time is saved in the account and a
//     scheduled GitHub workflow (.github/scripts/send_reminders.py) sends the reminder only on days the learner
//     has not studied yet. Needs an account; on iPhone the app must be added to the Home Screen first.
//  2. A repeating event in the phone's calendar (.ics), which works for everyone, even without an account.
//  In the native app (Capacitor, Android / iPhone) the WebView has no web push: local notifications are scheduled on
//  the phone itself instead (@capacitor-community / @capacitor/local-notifications; no account or server needed).
//  The next 14 days are scheduled one by one, and today's is cancelled as soon as the learner studies.
import { S, update } from './state.js?v=202611261331';
import { CFG } from './app-config.js?v=202611261331';
import { getUser, isVerified, loadReminder, saveReminder, firebaseApp } from './firebase-auth.js?v=202611261331';

const FB = 'https://www.gstatic.com/firebasejs/12.16.0/';
const L = o => (o && (o[S.lang] || (S.lang === 'es' ? o.es : o.en) || o.es)) || '';
const NAME = {
  espanol: { es: 'español', en: 'Spanish' }, english: { es: 'inglés', en: 'English' }, francais: { es: 'francés', en: 'French' },
  deutsch: { es: 'alemán', en: 'German' }, chino: { es: 'chino', en: 'Chinese' }, nihongo: { es: 'japonés', en: 'Japanese' }, arabic: { es: 'árabe', en: 'Arabic' },
}[CFG.id] || { es: 'idiomas', en: 'languages' };
const TX = {
  title: { es: 'Recordatorio diario', en: 'Daily reminder' },
  sub: { es: 'Te aviso a la hora que elijas, solo los días que aún no hayas estudiado.', en: 'I’ll remind you at the time you choose, only on days you haven’t studied yet.' },
  time: { es: 'Hora', en: 'Time' },
  push: { es: 'Activar notificaciones', en: 'Turn on notifications' },
  pushOn: { es: 'Notificaciones activadas en este dispositivo', en: 'Notifications on for this device' },
  off: { es: 'Desactivar', en: 'Turn off' }, test: { es: 'Probar', en: 'Test' },
  cal: { es: 'Añadir a mi calendario', en: 'Add to my calendar' },
  calSub: { es: 'Crea un evento diario con alarma en el calendario del móvil (funciona en todos los móviles, sin cuenta).', en: 'Creates a daily event with an alarm in your phone’s calendar (works on every phone, no account needed).' },
  needAcc: { es: 'Para las notificaciones necesitas iniciar sesión (con el correo verificado). El calendario funciona siempre.', en: 'Notifications need you to sign in (with a verified email). The calendar always works.' },
  ios: { es: 'En iPhone: toca Compartir → «Añadir a pantalla de inicio», abre la app desde ese icono y activa aquí las notificaciones.', en: 'On iPhone: tap Share → “Add to Home Screen”, open the app from that icon and turn notifications on here.' },
  noSupport: { es: 'Este navegador no admite notificaciones. Usa Chrome, o en iPhone añade la app a la pantalla de inicio. Mientras, usa el calendario.', en: 'This browser doesn’t support notifications. Use Chrome, or on iPhone add the app to the Home Screen. Meanwhile, use the calendar.' },
  denied: { es: 'Las notificaciones están bloqueadas para esta web. Actívalas en los ajustes del navegador.', en: 'Notifications are blocked for this site. Allow them in the browser settings.' },
  saved: { es: '✓ Guardado. Te avisaré a las {t}.', en: '✓ Saved. I’ll remind you at {t}.' },
  offOk: { es: 'Recordatorios desactivados.', en: 'Reminders turned off.' },
  testTitle: { es: '¡Así se verán los recordatorios!', en: 'This is how reminders will look!' },
  testBody: { es: '¿5 minutos de {l} hoy? 💪', en: '5 minutes of {l} today? 💪' },
  evTitle: { es: 'Estudiar {l} ({m} min)', en: 'Study {l} ({m} min)' },
  evBody: { es: 'Tu rato de {l}. Abre la app: {u}', en: 'Your {l} time. Open the app: {u}' },
  working: { es: 'Un momento…', en: 'One moment…' },
  nTitle: { es: '¿Unos minutos de {l}? 💪', en: 'A few minutes of {l}? 💪' },
  nBody: { es: 'Hoy aún no has estudiado. Un repaso rápido de tarjetas y listo.', en: 'You haven’t studied today yet. A quick card review is enough.' },
  streakT: { es: '🔥 ¡No pierdas tu racha de {n} días!', en: '🔥 Keep your {n}-day streak!' },
  nativeOn: { es: 'Notificaciones activadas en este móvil', en: 'Notifications on for this phone' },
};
const tx = (k, v = {}) => L(TX[k]).replace(/\{(\w)\}/g, (_, x) => v[x] ?? '');
const pad = n => String(n).padStart(2, '0');
const hm = r => `${pad(r.h)}:${pad(r.m)}`;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const local = () => ({ on: false, h: 20, m: 0, ...(S.reminder || {}) });
const LN = () => (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()
  && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
const dayStr = d => d.toLocaleDateString('sv');
const studiedToday = () => !!(S.studyTime && S.studyTime.d === dayStr(new Date()) && S.studyTime.t >= 120);
const BASE_ID = 7100;

// Native: (re)schedule the daily reminder for the next 14 days, skipping today if already studied.
async function nativeSchedule() {
  const N = LN();
  if (!N) return;
  const r = local();
  try {
    const pending = await N.getPending().catch(() => ({ notifications: [] }));
    const mine = (pending.notifications || []).filter(n => n.id >= BASE_ID && n.id < BASE_ID + 20).map(n => ({ id: n.id }));
    if (mine.length) await N.cancel({ notifications: mine });
    if (!r.on) return;
    const now = new Date(), list = [];
    for (let i = 0; i < 14; i++) {
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, r.h, r.m, 0);
      if (at <= now || (i === 0 && studiedToday())) continue;
      const streak = S.streak || 0;
      list.push({ id: BASE_ID + i, at,
        title: i === 0 && streak >= 2 ? tx('streakT', { n: streak }) : tx('nTitle', { l: L(NAME) }), body: tx('nBody'),
        schedule: { at, allowWhileIdle: true }, extra: { link: location.href } });
    }
    if (list.length) await N.schedule({ notifications: list.map(({ at, ...n }) => n) });
  } catch (e) { console.warn('local notifications', e); }
}
let lastStudied = false;
if (LN()) {
  setTimeout(nativeSchedule, 3000);
  // Studied today -> cancel today's reminder (checked every minute; the study time is counted in plan.js).
  setInterval(() => { const s = studiedToday(); if (s && !lastStudied) nativeSchedule(); lastStudied = s; }, 60000);
}

export function reminderSettings() {
  css();
  setTimeout(hydrate, 0);
  const r = local();
  const opts = [];
  for (let h = 6; h <= 23; h++) for (const m of [0, 30]) opts.push(`<option value="${h}:${m}" ${r.h === h && r.m === m ? 'selected' : ''}>${pad(h)}:${pad(m)}</option>`);
  return `<div class="card mb-16 rem-card" id="rem-card">
    <div class="h3 mb-8">🔔 ${tx('title')}</div>
    <div class="muted small mb-12">${tx('sub')}</div>
    <label class="flex items-center gap-8 mb-12"><span>${tx('time')}</span>
      <select id="rem-time" class="rem-sel" onchange="window.__remTime(this.value)">${opts.join('')}</select></label>
    <div id="rem-push"></div>
    <div id="rem-msg" class="small mt-8"></div>
    <div class="rem-sep"></div>
    <button class="btn btn-soft btn-block" onclick="window.__remCal()">📅 ${tx('cal')}</button>
    <div class="muted small mt-8">${tx('calSub')}</div>
  </div>`;
}

function pushBlock(r) {
  const box = document.getElementById('rem-push');
  if (!box) return;
  if (LN()) {
    box.innerHTML = r.on
      ? `<div class="rem-on mb-8">✓ ${tx('nativeOn')} · ${hm(r)}</div>
         <div class="flex gap-8"><button class="btn btn-soft" onclick="window.__remTest()">${tx('test')}</button><button class="btn btn-soft" onclick="window.__remOff()">${tx('off')}</button></div>`
      : `<button class="btn btn-primary btn-block" onclick="window.__remPush()">🔔 ${tx('push')}</button>`;
    return;
  }
  const user = getUser();
  if (!user || !isVerified()) { box.innerHTML = `<div class="muted small">${tx('needAcc')}</div>`; return; }
  if (isIOS && !standalone()) { box.innerHTML = `<div class="rem-hint small">${tx('ios')}</div>`; return; }
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) { box.innerHTML = `<div class="rem-hint small">${tx('noSupport')}</div>`; return; }
  const mine = r.on && Notification.permission === 'granted' && localStorage.getItem('rem_token');
  box.innerHTML = mine
    ? `<div class="rem-on mb-8">✓ ${tx('pushOn')} · ${hm(r)}</div>
       <div class="flex gap-8"><button class="btn btn-soft" onclick="window.__remTest()">${tx('test')}</button><button class="btn btn-soft" onclick="window.__remOff()">${tx('off')}</button></div>`
    : `<button class="btn btn-primary btn-block" onclick="window.__remPush()">🔔 ${tx('push')}</button>`;
}

async function hydrate() {
  let r = local();
  try { const c = await loadReminder(); if (c) { r = { ...r, on: !!c.on, h: c.h ?? r.h, m: c.m ?? r.m }; update({ reminder: { on: r.on, h: r.h, m: r.m } }); } } catch (e) {}
  const sel = document.getElementById('rem-time');
  if (sel) sel.value = `${r.h}:${r.m}`;
  pushBlock(r);
}
const msg = (h, bad) => { const m = document.getElementById('rem-msg'); if (m) m.innerHTML = bad ? `<span style="color:var(--no)">${h}</span>` : h; };

async function swReg() {
  return navigator.serviceWorker.register('../idiomas/fcm-sw.js', { scope: '../idiomas/' });
}
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (h * 33 ^ s.charCodeAt(i)) >>> 0; return 'd' + h.toString(36); };

async function store(patch) {
  const cur = (await loadReminder().catch(() => null)) || {};
  const r = { ...local(), ...patch };
  const rem = { ...cur, on: r.on, h: r.h, m: r.m, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    lang: S.lang === 'es' ? 'es' : 'en', app: CFG.id, tokens: { ...(cur.tokens || {}) } };
  const tok = localStorage.getItem('rem_token');
  if (patch.token) rem.tokens[hash(patch.token)] = { t: patch.token, at: Date.now(), ua: navigator.userAgent.slice(0, 120) };
  if (patch.dropToken && tok) delete rem.tokens[hash(tok)];
  await saveReminder(rem);
  update({ reminder: { on: r.on, h: r.h, m: r.m } });
  return r;
}

window.__remTime = async v => {
  const [h, m] = v.split(':').map(Number);
  update({ reminder: { ...local(), h, m } });
  if (LN()) { await nativeSchedule(); if (local().on) msg(tx('saved', { t: hm(local()) })); return; }
  if (!getUser() || !isVerified()) return;
  try { const r = await store({ h, m }); if (r.on) msg(tx('saved', { t: hm(r) })); } catch (e) { msg(e.message, true); }
};
window.__remPush = async () => {
  msg(tx('working'));
  const N = LN();
  if (N) {
    try {
      let p = await N.checkPermissions().catch(() => ({}));
      if (p.display !== 'granted') p = await N.requestPermissions();
      if (p.display !== 'granted') return msg(tx('denied'), true);
      update({ reminder: { ...local(), on: true } });
      await nativeSchedule();
      // Keep the account copy too (time, language), so a future browser device uses the same time.
      if (getUser() && isVerified()) store({ on: true }).catch(() => {});
      msg(tx('saved', { t: hm(local()) }));
      pushBlock(local());
    } catch (e) { msg(String(e && e.message || e), true); }
    return;
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return msg(tx('denied'), true);
    const reg = await swReg();
    await navigator.serviceWorker.ready;
    const { getMessaging, getToken, isSupported } = await import(FB + 'firebase-messaging.js');
    if (!(await isSupported())) return msg(tx('noSupport'), true);
    const token = await getToken(getMessaging(firebaseApp()), { serviceWorkerRegistration: reg });
    if (!token) throw new Error('no-token');
    localStorage.setItem('rem_token', token);
    const r = await store({ on: true, token });
    msg(tx('saved', { t: hm(r) }));
    pushBlock(r);
  } catch (e) { msg(String(e && e.message || e), true); }
};
window.__remOff = async () => {
  if (LN()) { update({ reminder: { ...local(), on: false } }); await nativeSchedule(); msg(tx('offOk')); return pushBlock(local()); }
  try { const r = await store({ on: false, dropToken: true }); localStorage.removeItem('rem_token'); msg(tx('offOk')); pushBlock(r); }
  catch (e) { msg(e.message, true); }
};
window.__remTest = async () => {
  const N = LN();
  if (N) {
    try { await N.schedule({ notifications: [{ id: BASE_ID + 19, title: tx('testTitle'), body: tx('testBody', { l: L(NAME) }), schedule: { at: new Date(Date.now() + 3000) } }] }); }
    catch (e) { msg(e.message, true); }
    return;
  }
  try {
    const reg = await swReg();
    await reg.showNotification(tx('testTitle'), { body: tx('testBody', { l: L(NAME) }), icon: new URL('icons/icon-192.png', location.href).href, data: { link: location.href } });
  } catch (e) { msg(e.message, true); }
};

// Calendar: a daily repeating event with an alarm at the chosen time, opened by the phone's calendar app.
window.__remCal = () => {
  const r = local(), mins = (S.plan && S.plan.mins) || 15;
  const d = new Date(); d.setDate(d.getDate() + (d.getHours() * 60 + d.getMinutes() >= r.h * 60 + r.m ? 1 : 0));
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const url = location.origin + location.pathname;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Idiomas//Reminder//ES', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:idiomas-${CFG.id}-${Date.now()}@carlosholivan.github.io`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${day}T${pad(r.h)}${pad(r.m)}00`, `DURATION:PT${mins}M`, 'RRULE:FREQ=DAILY',
    `SUMMARY:${tx('evTitle', { l: L(NAME), m: mins })}`, `DESCRIPTION:${tx('evBody', { l: L(NAME), u: url })}`, `URL:${url}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0M', `DESCRIPTION:${tx('evTitle', { l: L(NAME), m: mins })}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = `recordatorio-${CFG.id}.ics`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
};

function css() {
  if (document.getElementById('rem-css')) return;
  const s = document.createElement('style');
  s.id = 'rem-css';
  s.textContent = `.rem-card{padding:18px}.rem-sel{font:inherit;font-size:16px;padding:8px 10px;border-radius:12px;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
.rem-hint{padding:10px 12px;border-radius:12px;background:var(--soft)}.rem-on{color:var(--ok);font-weight:600}
.rem-sep{height:1px;background:var(--line);margin:16px 0}.btn-block{width:100%}`;
  document.head.appendChild(s);
}
