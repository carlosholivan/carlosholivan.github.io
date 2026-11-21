"""Lists the sentences and reading paragraphs of one app that get the new voice: [(spoken text, mp3 file name)].
Uses each app's own tools/generate_audio.py so the file names are exactly the ones the app already plays."""
import importlib.util, re, sys, types

CJK = {'chino', 'nihongo'}


def _load(app):
    sys.modules.setdefault('edge_tts', types.ModuleType('edge_tts'))
    sys.path.insert(0, f'{app}-app/tools')
    spec = importlib.util.spec_from_file_location(f'{app}_ga', f'{app}-app/tools/generate_audio.py')
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def is_sentence(app, s):
    s = s.strip()
    if app in CJK:
        return len(re.sub(r'\s', '', s)) >= 6
    n = len(s.split())
    return n >= 4 or (n >= 2 and bool(re.search(r'[.!?؟]$', s)))


def items(app):
    m = _load(app)
    out = {}
    if hasattr(m, 'collect'):                      # arabic, nihongo: {key: spoken}
        for s in set(m.collect().values()):
            out[m.file_for(s)] = s
    else:
        texts = m.collect_texts()
        for t in (texts if not isinstance(texts, dict) else texts.keys()):
            t = t if isinstance(t, str) else t[0]
            s = m.spoken(t) if hasattr(m, 'spoken') else t
            out[m.file_for(t)] = s
    return sorted(((s, f) for f, s in out.items() if is_sentence(app, s)), key=lambda x: x[1])


if __name__ == '__main__':
    for s, f in items(sys.argv[1])[:5]:
        print(f, s[:70])
