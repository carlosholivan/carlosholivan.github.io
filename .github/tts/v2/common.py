"""Shared bits of the character-voice pipeline (v2): which lines exist, which model reads which language, and the
voice description of each character. Voices are designed from text (Qwen3-TTS VoiceDesign), never cloned from a
real person, and stored in refs/<app>/<who>.wav so a character always keeps the same voice."""
import glob, hashlib, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
LANG = {'chino': ('zh', 'Chinese'), 'nihongo': ('ja', 'Japanese'), 'arabic': ('ar', None), 'espanol': ('es', 'Spanish'),
        'english': ('en', 'English'), 'francais': ('fr', 'French'), 'deutsch': ('de', 'German')}
AGE = {'kid': {'m': 'a 10-year-old boy, bright, curious and lively', 'f': 'a 10-year-old girl, bright, cheerful and sweet'},
       'adult': {'m': 'a man around 40, warm, calm and kind', 'f': 'a woman around 40, warm, gentle and caring'},
       'old': {'m': 'an elderly man around 75, slow, wise and friendly', 'f': 'an elderly woman around 75, soft, slow and kind'}}


def meta(app):
    return json.load(open(f'{ROOT}/{app}-app/data/story/meta.json', encoding='utf8'))


def lines(app):
    """(who, text) of every story line plus the coach phrases, exactly as the app looks them up (who|text)
    (same rule as story_audio.py)."""
    out = set()
    def walk(x):
        if isinstance(x, dict):
            if 'who' in x and isinstance(x.get('t'), str) and x['t'].strip(): out.add((x['who'], x['t'].strip()))
            for v in x.values(): walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    for f in glob.glob(f'{ROOT}/{app}-app/data/story/*.json'):
        if not f.endswith('meta.json'): walk(json.load(open(f, encoding='utf8')))
    m = meta(app)
    for who, c in m.get('cast', {}).items():
        if who != 'narr' and (c.get('voice') or {}).get('age') != 'pet':
            for t in m.get('coach', []): out.add((who, t))
    return sorted(out)


def cast(app):
    """who -> {instruct, gender} for every speaking character except pets (they keep their old voices)."""
    m, out = meta(app), {}
    for who, c in m.get('cast', {}).items():
        v = c.get('voice') or {}
        if v.get('age') == 'pet': continue
        role = ((c.get('role') or {}).get('en') or '').strip()
        if who == 'narr':
            desc = 'a warm, calm adult storyteller narrating a children\'s story'
        else:
            desc = AGE.get(v.get('age'), AGE['adult'])[v.get('g', 'f')] + (f', who is {role.lower()}' if role and role.lower() != 'hero' else '')
        out[who] = {'instruct': f'{desc}. Natural, expressive and friendly, clear studio recording, moderate pace.'}
    if 'narr' not in out:
        out['narr'] = {'instruct': 'A warm, calm adult storyteller narrating a children\'s story. Clear studio recording, moderate pace.'}
    return out


def key_hash(who, text):
    return 'v2-' + hashlib.sha1(f'v2|{who}|{text}'.encode()).hexdigest()[:16]
