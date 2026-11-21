"""Merges the shard results into each app's data/audio/tts_v2.json (files that now have the new voice)."""
import glob, json, os
by = {}
for f in glob.glob('out/done-*.json'):
    d = json.load(open(f)); by.setdefault(d['app'], []).append(d)
for app, ds in by.items():
    man = f'{app}-app/data/audio/tts_v2.json'
    cur = json.load(open(man)) if os.path.exists(man) else {'engine': 'chatterbox-multilingual', 'files': [], 'failed': []}
    files = set(cur['files']); failed = set(cur.get('failed', []))
    for d in ds: files |= set(d['files']); failed |= set(d['failed'])
    failed -= files
    cur.update(files=sorted(files), failed=sorted(failed))
    os.makedirs(os.path.dirname(man), exist_ok=True)
    json.dump(cur, open(man, 'w'), indent=0)
    print(app, len(files), 'with new voice,', len(failed), 'kept old voice')
