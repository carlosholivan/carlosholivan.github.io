// Service worker for the daily study reminders (push via Firebase Cloud Messaging), shared by all the language apps.
// The sender (.github/scripts/send_reminders.py) sends data-only messages: { title, body, link, icon }.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { data: { body: e.data && e.data.text() } }; }
  const d = p.data || {}, n = p.notification || {};
  const title = d.title || n.title || 'Idiomas';
  e.waitUntil(self.registration.showNotification(title, {
    body: d.body || n.body || '',
    icon: d.icon || n.icon || '/idiomas/icons/icon-192.png',
    badge: d.icon || '/idiomas/icons/icon-192.png',
    tag: 'idiomas-daily',
    renotify: true,
    data: { link: d.link || (p.fcmOptions && p.fcmOptions.link) || '/idiomas/' },
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const link = new URL((e.notification.data && e.notification.data.link) || '/idiomas/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(link) && 'focus' in c) return c.focus();
    return self.clients.openWindow(link);
  }));
});
