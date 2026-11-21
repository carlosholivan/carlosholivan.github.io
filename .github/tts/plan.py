"""Splits the work into shards of ~1600 s of expected audio (≈ 4.5 h of CPU each) for the TTS workflow.
Writes shards/<app>-<n>.json ([[text, file], …]) and prints the job matrix as JSON."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from items import items

CPS = {'espanol': 14, 'english': 14, 'francais': 14, 'deutsch': 13, 'arabic': 11, 'nihongo': 7, 'chino': 4.5}
apps = sys.argv[1].split(',')
limit = int(sys.argv[2]) if len(sys.argv) > 2 else 0        # max items per app (0 = all), for trial runs
BUDGET = 1600
os.makedirs('shards', exist_ok=True)
matrix = []
for app in apps:
    man = f'{app}-app/data/audio/tts_v2.json'
    done = set(json.load(open(man))['files']) if os.path.exists(man) else set()
    todo = [x for x in items(app) if x[1] not in done]
    if limit: todo = todo[:limit]
    shard, secs, n = [], 0, 0
    for s, f in todo:
        shard.append([s, f]); secs += len(s) / CPS[app]
        if secs >= BUDGET:
            json.dump(shard, open(f'shards/{app}-{n}.json', 'w'), ensure_ascii=False); matrix.append({'app': app, 'shard': n}); n += 1
            shard, secs = [], 0
    if shard:
        json.dump(shard, open(f'shards/{app}-{n}.json', 'w'), ensure_ascii=False); matrix.append({'app': app, 'shard': n})
    print(f'{app}: {len(todo)} items, {n + (1 if shard else 0)} shards', file=sys.stderr)
print(json.dumps({'include': matrix}))
