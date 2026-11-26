"""Story mode voices: every line of every scene, read by a voice that fits who says it (woman or man; child, adult
or elder), with the free Microsoft Edge neural voices. Characters of the same gender get different voices where the
language has several, and a different pitch where it does not, so they never sound the same.
Output per app: data/audio/story/<hash>.mp3 and data/audio/story.json  {"<who>|<text>": "<hash>.mp3"}.
Only missing clips are generated; clips no longer used are deleted.   Usage: python story_audio.py chino nihongo …"""
import asyncio, glob, hashlib, json, os, sys
import edge_tts

LOCALE = {'chino': 'zh-CN', 'nihongo': 'ja-JP', 'arabic': 'ar-SA', 'espanol': 'es-ES', 'english': 'en-GB', 'francais': 'fr-FR', 'deutsch': 'de-DE'}
# Voices that sound young, when the language has them (used first for children).
YOUNG = ('Yunxia', 'Xiaoyi', 'Maisie', 'Eloise', 'Gisela', 'Ximena')
PITCH = {'kid': 14, 'adult': 0, 'old': -10, 'pet': 30}       # Hz
RATE = {'kid': 0, 'adult': -5, 'old': -14, 'pet': 0}         # %


def lines(app):
    """(who, text) of every spoken line in the app's story chapters."""
    out = set()
    def walk(x):
        if isinstance(x, dict):
            if 'who' in x and isinstance(x.get('t'), str) and x['t'].strip(): out.add((x['who'], x['t'].strip()))
            for v in x.values(): walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    for f in glob.glob(f'{app}-app/data/story/*.json'):
        if not f.endswith('meta.json'): walk(json.load(open(f, encoding='utf8')))
    return sorted(out)


def assign(app, cast, voices, count, hero=None):
    """who → (voice, rate, pitch). Most talkative first, so the main cast gets the clearest voices."""
    pools = {g: [v['ShortName'] for v in voices if v['Gender'] == ('Female' if g == 'f' else 'Male')] for g in 'fm'}
    for g in 'fm':
        if not pools[g]: pools[g] = [v['ShortName'] for v in voices]          # language with one gender only
    used, out = {}, {}
    for who in sorted(cast, key=lambda k: (k != hero, -count.get(k, 0))):
        c = cast[who].get('voice') or {'g': 'f', 'age': 'adult'}
        g, age = c['g'], c['age']
        pool = pools[g]
        if age == 'kid':
            pool = sorted(pool, key=lambda n: (not any(y in n for y in YOUNG)))
        key = (g, 'narr' if who == 'narr' else age)
        k = used.get(key, 0)
        used[key] = k + 1
        voice = pool[k % len(pool)]
        # Same voice again for this kind of character: shift the pitch so it still sounds like someone else.
        pitch = PITCH[age] + (0, 6, -6, 12, -12, 18, -18)[min(k // len(pool), 6)]
        out[who] = (voice, f'{RATE[age]:+d}%', f'{pitch:+d}Hz')
    return out


async def synth(text, path, voice, rate, pitch, sem):
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(path)
                if os.path.getsize(path) > 0: return True
            except Exception as e:
                err = e
            await asyncio.sleep(2 + attempt * 3)
        print('failed:', voice, text[:50], err)
        return False


async def main(apps):
    allv = await edge_tts.list_voices()
    for app in apps:
        meta = json.load(open(f'{app}-app/data/story/meta.json', encoding='utf8'))
        cast = dict(meta['cast'])
        cast.setdefault('narr', {'voice': {'g': 'f', 'age': 'adult'}})
        voices = sorted((v for v in allv if v['Locale'] == LOCALE[app]), key=lambda v: v['ShortName'])
        ls = lines(app)
        count = {}
        for who, _ in ls: count[who] = count.get(who, 0) + 1
        vmap = assign(app, cast, voices, count, meta.get('hero'))
        d = f'{app}-app/data/audio/story'
        os.makedirs(d, exist_ok=True)
        index, jobs, sem = {}, [], asyncio.Semaphore(8)
        for who, text in ls:
            voice, rate, pitch = vmap.get(who) or vmap['narr']
            name = hashlib.md5(f'{voice}|{rate}|{pitch}|{text}'.encode()).hexdigest()[:14] + '.mp3'
            index[f'{who}|{text}'] = name
            if not os.path.exists(f'{d}/{name}'): jobs.append(synth(text, f'{d}/{name}', voice, rate, pitch, sem))
        print(f'{app}: {len(ls)} lines, {len(jobs)} to generate;', ', '.join(f'{w}={v[0].split("-")[-1]}{v[2]}' for w, v in vmap.items()), flush=True)
        ok = await asyncio.gather(*jobs)
        index = {k: v for k, v in index.items() if os.path.exists(f'{d}/{v}') and os.path.getsize(f'{d}/{v}') > 0}
        for f in os.listdir(d):                                  # clips of lines that changed or were removed
            if f.endswith('.mp3') and f not in set(index.values()): os.remove(f'{d}/{f}')
        json.dump(index, open(f'{app}-app/data/audio/story.json', 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        print(f'{app}: {sum(ok)}/{len(jobs)} generated', flush=True)


asyncio.run(main(sys.argv[1:] or list(LOCALE)))
