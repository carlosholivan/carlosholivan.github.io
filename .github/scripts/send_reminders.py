"""Daily study reminders for the language apps (run every 15 min by .github/workflows/reminders.yml).

Reads users/{uid}.reminder from Firestore ({on, h, m, tz, lang, app, tokens: {id: {t}}, sent}) and, when the
learner's local time has reached the chosen time, sends one push (Firebase Cloud Messaging HTTP v1) to each of
their devices — only if they have not studied yet that day — and marks the day as sent. Invalid tokens are removed.

Needs the repository secret FIREBASE_SERVICE_ACCOUNT (the JSON key of a Firebase service account).
"""
import json, os, sys, datetime
from zoneinfo import ZoneInfo
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

SITE = 'https://carlosholivan.github.io'
APPS = {  # Firestore field -> (app id, path, name es, name en)
    'espanol': ('espanol', '/espanol-app/', 'español', 'Spanish'), 'english': ('english', '/english-app/', 'inglés', 'English'),
    'francais': ('francais', '/francais-app/', 'francés', 'French'), 'deutsch': ('deutsch', '/deutsch-app/', 'alemán', 'German'),
    'chino': ('chino', '/chino-app/', 'chino', 'Chinese'), 'nihongo': ('nihongo', '/nihongo-app/', 'japonés', 'Japanese'),
    'arabe': ('arabic', '/arabic-app/', 'árabe', 'Arabic'),
}
BY_ID = {v[0]: v for v in APPS.values()}
WINDOW_MIN = 90  # send if now is within 90 min after the chosen time (scheduled runs can be late)


def val(v):
    """Firestore REST value -> Python."""
    if 'mapValue' in v: return {k: val(x) for k, x in v['mapValue'].get('fields', {}).items()}
    if 'arrayValue' in v: return [val(x) for x in v['arrayValue'].get('values', [])]
    for k in ('stringValue', 'booleanValue'): 
        if k in v: return v[k]
    if 'integerValue' in v: return int(v['integerValue'])
    if 'doubleValue' in v: return float(v['doubleValue'])
    return None


def main():
    raw = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '').strip()
    if not raw:
        print('FIREBASE_SERVICE_ACCOUNT not set: nothing to do'); return
    info = json.loads(raw)
    pid = info['project_id']
    creds = service_account.Credentials.from_service_account_info(info, scopes=[
        'https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/firebase.messaging'])
    creds.refresh(Request())
    H = {'Authorization': f'Bearer {creds.token}', 'Content-Type': 'application/json'}
    base = f'https://firestore.googleapis.com/v1/projects/{pid}/databases/(default)/documents'
    q = {'structuredQuery': {'from': [{'collectionId': 'users'}], 'where': {'fieldFilter': {
        'field': {'fieldPath': 'reminder.on'}, 'op': 'EQUAL', 'value': {'booleanValue': True}}}}}
    rows = requests.post(f'{base}:runQuery', headers=H, json=q, timeout=60).json()
    sent = 0
    for row in rows:
        d = row.get('document')
        if not d: continue
        uid = d['name'].rsplit('/', 1)[-1]
        f = {k: val(v) for k, v in d.get('fields', {}).items()}
        rem = f.get('reminder') or {}
        try: tz = ZoneInfo(rem.get('tz') or 'UTC')
        except Exception: tz = ZoneInfo('UTC')
        now = datetime.datetime.now(tz)
        today = now.date().isoformat()
        target = now.replace(hour=int(rem.get('h', 20)), minute=int(rem.get('m', 0)), second=0, microsecond=0)
        if rem.get('sent') == today or not (target <= now < target + datetime.timedelta(minutes=WINDOW_MIN)):
            continue
        # Studied today in any app (study time is counted per local day by the apps)?
        studied, streak, last_app = False, 0, None
        for field, meta in APPS.items():
            st = f.get(field)
            if not isinstance(st, dict): continue
            t = st.get('studyTime') or {}
            if t.get('d') == today and (t.get('t') or 0) >= 120: studied = True
            streak = max(streak, int(st.get('streak') or 0))
        tokens = rem.get('tokens') or {}
        dead = []
        if not studied and tokens:
            app = BY_ID.get(rem.get('app')) or BY_ID['espanol']
            es = rem.get('lang', 'es') == 'es'
            name = app[2] if es else app[3]
            if streak >= 2:
                title = f'🔥 ¡No pierdas tu racha de {streak} días!' if es else f'🔥 Keep your {streak}-day streak!'
            else:
                title = f'¿Unos minutos de {name}? 💪' if es else f'A few minutes of {name}? 💪'
            body = ('Hoy aún no has estudiado. Un repaso rápido de tarjetas y listo.' if es
                    else 'You haven’t studied today yet. A quick card review is enough.')
            for key, tk in tokens.items():
                token = tk.get('t') if isinstance(tk, dict) else None
                if not token: continue
                msg = {'message': {'token': token, 'data': {'title': title, 'body': body, 'link': SITE + app[1],
                       'icon': SITE + app[1] + 'icons/icon-192.png'}, 'webpush': {'headers': {'Urgency': 'high', 'TTL': '7200'}}}}
                r = requests.post(f'https://fcm.googleapis.com/v1/projects/{pid}/messages:send', headers=H, json=msg, timeout=30)
                if r.ok: sent += 1
                elif r.status_code in (400, 404) and ('UNREGISTERED' in r.text or 'INVALID_ARGUMENT' in r.text): dead.append(key)
                else: print('send failed', uid[:6], r.status_code, r.text[:200])
        # Mark the day (also when they had already studied, so they are not checked again today).
        fields = {'sent': {'stringValue': today}}
        mask = ['reminder.sent']
        if dead:
            keep = {k: v for k, v in tokens.items() if k not in dead}
            fields['tokens'] = {'mapValue': {'fields': {k: {'mapValue': {'fields': {kk: {'stringValue': str(vv)} if not isinstance(vv, int) else {'integerValue': str(vv)} for kk, vv in v.items()}}} for k, v in keep.items()}}}
            mask.append('reminder.tokens')
        params = '&'.join(f'updateMask.fieldPaths={m}' for m in mask)
        requests.patch(f'{base}/users/{uid}?{params}', headers=H, json={'fields': {'reminder': {'mapValue': {'fields': fields}}}}, timeout=30)
    print(f'reminders sent: {sent}')


if __name__ == '__main__':
    sys.exit(main())
